console.log(
    "AI Requirement Analyzer live caption monitor started."
);


// ========================================
// CONFIGURATION
// ========================================

const TRANSCRIPT_STORAGE_KEY =
    "liveTranscript";

const SEEN_LINES_STORAGE_KEY =
    "seenTranscriptLines";

const LAST_ANALYZED_LINE_COUNT_STORAGE_KEY =
    "lastAnalyzedLineCount";

const LIVE_ANALYSIS_STORAGE_KEY =
    "liveAnalysis";

const BACKEND_ANALYZE_URL =
    "http://127.0.0.1:8000/analyze-transcript";

// Wait until there has been no new caption text for 10 seconds
const ANALYSIS_DEBOUNCE_MS = 10000;


// Google Meet live-caption containers.
// Meet changes class names often, so we keep a few simple fallbacks.
const MEET_CAPTION_ROOT_SELECTORS = [

    // Official captions region (appears after Live Captions are turned on)
    '[role="region"][aria-label*="aption" i]',

    // Current Meet caption text container
    'div[jsname="tgaKEf"]',

    // Older Meet caption window
    "div.a4cQT",

    // Older Meet caption list wrapper
    "div.iOzk7"

];


// Simple Zoom caption selectors (for later support; Meet is the main target)
const ZOOM_CAPTION_ROOT_SELECTORS = [

    '[class*="live-transcription"]',

    '[class*="LiveTranscript"]',

    '[class*="caption-container"]',

    '[class*="captionContainer"]'

];


// ========================================
// IN-MEMORY DATA
// ========================================

let transcriptLines = [];

let seenLines = new Set();

let lastAnalyzedLineCount = 0;

let analysisTimer = null;

let analysisInProgress = false;

let analysisQueued = false;


// ========================================
// PAGE TYPE
// ========================================

function isGoogleMeetPage() {

    return location.hostname.includes(
        "meet.google.com"
    );

}


function isZoomPage() {

    return location.hostname.includes(
        "zoom.us"
    );

}


// ========================================
// LOAD PREVIOUS DATA
// ========================================

async function loadSavedTranscript() {

    try {

        const data =
            await chrome.storage.local.get([
                TRANSCRIPT_STORAGE_KEY,
                SEEN_LINES_STORAGE_KEY,
                LAST_ANALYZED_LINE_COUNT_STORAGE_KEY
            ]);


        if (
            Array.isArray(
                data[TRANSCRIPT_STORAGE_KEY]
            )
        ) {

            transcriptLines =
                data[TRANSCRIPT_STORAGE_KEY];

        }


        if (
            Array.isArray(
                data[SEEN_LINES_STORAGE_KEY]
            )
        ) {

            seenLines = new Set(
                data[SEEN_LINES_STORAGE_KEY]
            );

        }


        if (
            Number.isInteger(
                data[LAST_ANALYZED_LINE_COUNT_STORAGE_KEY]
            )
        ) {

            lastAnalyzedLineCount =
                data[
                    LAST_ANALYZED_LINE_COUNT_STORAGE_KEY
                ];

        }


        if (
            lastAnalyzedLineCount >
            transcriptLines.length
        ) {

            lastAnalyzedLineCount =
                transcriptLines.length;

        }

    } catch (error) {

        console.error(
            "Could not load transcript:",
            error
        );

    }

}


// ========================================
// CLEAN TEXT
// ========================================

function cleanText(text) {

    if (!text) {

        return "";

    }


    return text
        .replace(/\s+/g, " ")
        .trim();

}


// ========================================
// ANALYSIS STATUS (for popup)
// ========================================

function saveAnalysisStatus(
    status,
    extra
) {

    const payload = Object.assign(
        {
            status: status,
            updatedAt: Date.now()
        },
        extra || {}
    );


    chrome.storage.local.set({

        [LIVE_ANALYSIS_STORAGE_KEY]:
            payload

    }).catch(() => {});

}


// ========================================
// SAVE TRANSCRIPT
// ========================================

function saveTranscript() {

    const fullTranscript =
        getFullTranscript();


    chrome.storage.local.set({

        [TRANSCRIPT_STORAGE_KEY]:
            transcriptLines,

        [SEEN_LINES_STORAGE_KEY]:
            Array.from(seenLines),

        [LAST_ANALYZED_LINE_COUNT_STORAGE_KEY]:
            lastAnalyzedLineCount,

        // Existing popup key so generate / evaluate / export still work
        transcript:
            fullTranscript

    }).catch((error) => {

        console.error(
            "Could not save transcript:",
            error
        );

    });

}


// ========================================
// ADD NEW TRANSCRIPT LINE
// ========================================

function addTranscriptText(text) {

    const cleanedText =
        cleanText(text);


    if (
        !cleanedText ||
        cleanedText.length < 2
    ) {

        return false;

    }


    const ignoredTexts = [

        "mute",
        "unmute",
        "leave",
        "chat",
        "participants",
        "captions",
        "more",
        "raise hand",
        "turn on captions",
        "turn off captions",
        "live captions"

    ];


    const lowerText =
        cleanedText.toLowerCase();


    if (
        ignoredTexts.includes(
            lowerText
        )
    ) {

        return false;

    }


    // Caption is still growing in the same bubble: update last line
    const lastLine =
        transcriptLines[
            transcriptLines.length - 1
        ];


    if (
        lastLine &&
        cleanedText !== lastLine &&
        cleanedText.startsWith(lastLine)
    ) {

        seenLines.delete(lastLine);

        seenLines.add(cleanedText);

        transcriptLines[
            transcriptLines.length - 1
        ] = cleanedText;

        saveTranscript();

        return true;

    }


    // Meet sometimes briefly shortens the same in-progress caption
    if (
        lastLine &&
        lastLine.startsWith(cleanedText)
    ) {

        return false;

    }


    if (
        seenLines.has(cleanedText)
    ) {

        return false;

    }


    seenLines.add(cleanedText);

    transcriptLines.push(cleanedText);


    if (transcriptLines.length > 5000) {

        transcriptLines =
            transcriptLines.slice(-5000);

    }


    saveTranscript();


    console.log(
        "New caption:",
        cleanedText
    );


    return true;

}


// ========================================
// AUTOMATIC AI ANALYSIS
// ========================================

function scheduleAutomaticAnalysis() {

    if (analysisTimer !== null) {

        clearTimeout(analysisTimer);

    }


    if (
        transcriptLines.length <=
        lastAnalyzedLineCount
    ) {

        return;

    }


    if (!analysisInProgress) {

        saveAnalysisStatus("waiting");

    }


    console.log(
        "New caption detected. AI analysis scheduled in 10 seconds."
    );


    analysisTimer = setTimeout(
        () => {

            analysisTimer = null;

            analyzeTranscriptAutomatically();

        },
        ANALYSIS_DEBOUNCE_MS
    );

}


async function analyzeTranscriptAutomatically() {

    // Do not send two analysis requests at the same time.
    if (analysisInProgress) {

        analysisQueued = true;

        console.log(
            "AI analysis already in progress. Newer transcript will be analyzed next."
        );

        return;

    }


    const transcript =
        getFullTranscript();


    if (!transcript) {

        return;

    }


    if (
        transcriptLines.length <=
        lastAnalyzedLineCount
    ) {

        return;

    }


    const linesAtStart =
        transcriptLines.length;


    analysisInProgress = true;

    analysisQueued = false;


    saveAnalysisStatus("analyzing");


    console.log(
        "Sending live transcript to backend for AI analysis..."
    );


    try {

        const response = await fetch(
            BACKEND_ANALYZE_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    transcript: transcript
                })
            }
        );


        if (!response.ok) {

            throw new Error(
                "Backend returned HTTP " +
                response.status
            );

        }


        const result =
            await response.json();


        if (
            !result ||
            typeof result.analysis !== "string"
        ) {

            throw new Error(
                "Backend returned an invalid analysis response."
            );

        }


        lastAnalyzedLineCount = Math.max(
            lastAnalyzedLineCount,
            linesAtStart
        );


        saveTranscript();


        await chrome.storage.local.set({

            [LIVE_ANALYSIS_STORAGE_KEY]: {
                status: "complete",
                analysis: result.analysis,
                updatedAt: Date.now(),
                lineCount: linesAtStart
            },

            // Existing popup key
            analysis: result.analysis

        });


        console.log(
            "Live AI analysis completed successfully."
        );

    } catch (error) {

        console.error(
            "Automatic AI analysis failed:",
            error
        );


        saveAnalysisStatus(
            "error",
            {
                error: error.message
            }
        );

    } finally {

        analysisInProgress = false;


        // New captions arrived while this request was running
        if (
            analysisQueued ||
            transcriptLines.length >
                lastAnalyzedLineCount
        ) {

            analysisQueued = false;

            scheduleAutomaticAnalysis();

        }

    }

}


// ========================================
// FIND CAPTION ROOT (Meet first, then Zoom)
// ========================================

function getCaptionRoot() {

    const selectors =
        isGoogleMeetPage()
            ? MEET_CAPTION_ROOT_SELECTORS
            : isZoomPage()
                ? ZOOM_CAPTION_ROOT_SELECTORS
                : [];


    for (const selector of selectors) {

        const element =
            document.querySelector(selector);


        if (element) {

            return element;

        }

    }


    return null;

}


// ========================================
// READ CAPTION TEXT FROM KNOWN DOM ONLY
// ========================================

function getCaptionTexts() {

    const root = getCaptionRoot();


    if (!root) {

        return [];

    }


    const texts = [];


    if (isGoogleMeetPage()) {

        // Prefer whole caption rows so we do not also
        // scrape the same text from nested child nodes.
        const rows =
            root.querySelectorAll(
                "div.nMcdL, div.TBMuR"
            );


        if (rows.length > 0) {

            rows.forEach((row) => {

                const captionEl =
                    row.querySelector(
                        "div.ygicle, span.CNusmb, div.iTTPOb"
                    );


                const text = cleanText(
                    captionEl
                        ? (captionEl.innerText || captionEl.textContent)
                        : (row.innerText || row.textContent)
                );


                if (text) {

                    texts.push(text);

                }

            });


            return texts;

        }


        const captionNodes =
            root.querySelectorAll(
                "div.ygicle, span.CNusmb"
            );


        if (captionNodes.length > 0) {

            captionNodes.forEach((node) => {

                const text = cleanText(
                    node.innerText ||
                    node.textContent
                );


                if (text) {

                    texts.push(text);

                }

            });


            return texts;

        }

    }


    // Fallback: only the caption region text, never the full page body
    const regionText = cleanText(
        root.innerText ||
        root.textContent ||
        ""
    );


    if (!regionText) {

        return [];

    }


    return regionText
        .split(/\n+/)
        .map(cleanText)
        .filter((line) => line.length >= 2);

}


function scanPageForTranscript() {

    const captionTexts =
        getCaptionTexts();


    let newTextDetected = false;


    captionTexts.forEach((text) => {

        if (addTranscriptText(text)) {

            newTextDetected = true;

        }

    });


    if (newTextDetected) {

        scheduleAutomaticAnalysis();

    }


    return newTextDetected;

}


// ========================================
// WATCH LIVE CAPTION DOM CHANGES
// ========================================

function startLiveObserver() {

    const observer = new MutationObserver(
        () => {

            // Only read known caption elements, not random page nodes
            scanPageForTranscript();

        }
    );


    function observeCaptionArea() {

        const root = getCaptionRoot();


        if (root) {

            observer.observe(
                root,
                {
                    childList: true,
                    subtree: true,
                    characterData: true
                }
            );


            console.log(
                "Watching live caption region:",
                root
            );


            return true;

        }


        return false;

    }


    if (!observeCaptionArea()) {

        // Captions appear only after the user turns them on.
        // Watch the page just enough to notice when the caption region is added.
        if (document.body) {

            observer.observe(
                document.body,
                {
                    childList: true,
                    subtree: true
                }
            );

        }


        const waitForCaptions =
            setInterval(
                () => {

                    if (getCaptionRoot()) {

                        observer.disconnect();

                        observeCaptionArea();

                        scanPageForTranscript();

                        clearInterval(
                            waitForCaptions
                        );

                    }

                },
                1500
            );

    }


    console.log(
        "Live caption observer is active."
    );

}


// ========================================
// PERIODIC SCAN (in case a mutation is missed)
// ========================================

function startPeriodicScan() {

    setInterval(
        () => {

            scanPageForTranscript();

        },
        2000
    );

}


// ========================================
// GET FULL TRANSCRIPT
// ========================================

function getFullTranscript() {

    return transcriptLines.join("\n");

}


// ========================================
// CLEAR LIVE TRANSCRIPT
// ========================================

function clearLiveTranscript() {

    if (analysisTimer !== null) {

        clearTimeout(analysisTimer);

        analysisTimer = null;

    }


    analysisQueued = false;

    transcriptLines = [];

    seenLines.clear();

    lastAnalyzedLineCount = 0;


    chrome.storage.local.remove([

        TRANSCRIPT_STORAGE_KEY,

        SEEN_LINES_STORAGE_KEY,

        LAST_ANALYZED_LINE_COUNT_STORAGE_KEY,

        LIVE_ANALYSIS_STORAGE_KEY,

        "transcript",

        "analysis"

    ]).catch((error) => {

        console.error(
            "Could not clear transcript data:",
            error
        );

    });


    saveAnalysisStatus("waiting_captions");


    console.log(
        "Live transcript cleared."
    );

}


// ========================================
// MESSAGE LISTENER
// ========================================

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {

        if (
            request.action ===
            "captureTranscript"
        ) {

            const foundNewText =
                scanPageForTranscript();


            const transcript =
                getFullTranscript();


            sendResponse({
                success: transcript.length > 0,
                transcript: transcript,
                lineCount: transcriptLines.length,
                newTextDetected:
                    Boolean(foundNewText)
            });

        }


        if (
            request.action ===
            "getLiveTranscript"
        ) {

            sendResponse({
                success:
                    transcriptLines.length > 0,
                transcript:
                    getFullTranscript(),
                lineCount:
                    transcriptLines.length
            });

        }


        if (
            request.action ===
            "getLiveAnalysis"
        ) {

            chrome.storage.local.get(
                [LIVE_ANALYSIS_STORAGE_KEY]
            ).then((data) => {

                sendResponse({
                    success: Boolean(
                        data[LIVE_ANALYSIS_STORAGE_KEY]
                    ),
                    analysis:
                        data[LIVE_ANALYSIS_STORAGE_KEY] ||
                        null
                });

            }).catch((error) => {

                sendResponse({
                    success: false,
                    error: error.message
                });

            });


            return true;

        }


        if (
            request.action ===
            "clearLiveTranscript"
        ) {

            clearLiveTranscript();

            sendResponse({
                success: true
            });

        }


        return true;

    }
);


// ========================================
// START MONITORING
// ========================================

async function initializeTranscriptMonitor() {

    await loadSavedTranscript();


    if (transcriptLines.length === 0) {

        saveAnalysisStatus("waiting_captions");

    } else if (
        transcriptLines.length >
        lastAnalyzedLineCount
    ) {

        scheduleAutomaticAnalysis();

    }


    scanPageForTranscript();

    startLiveObserver();

    startPeriodicScan();


    console.log(
        "AI Requirement Analyzer is now reading live captions from the meeting page."
    );

}


initializeTranscriptMonitor();
