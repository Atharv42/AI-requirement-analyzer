const BACKEND_URL = "http://127.0.0.1:8000";


// ========================================
// GET HTML ELEMENTS
// ========================================

const transcriptInput =
    document.getElementById("transcript");

const clarificationInput =
    document.getElementById("clarifications");

const questionProgress =
    document.getElementById("questionProgress");

const questionText =
    document.getElementById("questionText");

const answerInput =
    document.getElementById("answerInput");

const submitAnswerBtn =
    document.getElementById("submitAnswerBtn");

const clarificationDone =
    document.getElementById("clarificationDone");

const analysisOutput =
    document.getElementById("analysis");

const requirementsOutput =
    document.getElementById("requirements");

const evaluationOutput =
    document.getElementById("evaluation");


const captureBtn =
    document.getElementById("captureBtn");

const analyzeBtn =
    document.getElementById("analyzeBtn");

const generateBtn =
    document.getElementById("generateBtn");

const evaluateBtn =
    document.getElementById("evaluateBtn");

const clearBtn =
    document.getElementById("clearBtn");

const exportTxtBtn =
    document.getElementById("exportTxtBtn");

const exportDocxBtn =
    document.getElementById("exportDocxBtn");

const exportPdfBtn =
    document.getElementById("exportPdfBtn");

const analysisStatus =
    document.getElementById("analysisStatus");


let clarificationQuestions = [];

let clarificationIndex = 0;

let lastAnalysisForQuestions = "";


// ========================================
// CLARIFICATION QUESTIONS FROM AI ANALYSIS
// ========================================

function extractClarificationQuestions(analysisText) {

    if (!analysisText) {
        return [];
    }


    const heading =
        analysisText.match(
            /CLARIFICATION QUESTIONS:\s*/i
        );


    let section = analysisText;


    if (heading) {

        section = analysisText.slice(
            heading.index + heading[0].length
        );


        const nextHeading =
            section.search(/\n[A-Z][A-Z \t]+:/);


        if (nextHeading !== -1) {
            section = section.slice(0, nextHeading);
        }

    }


    const questions = [];

    const lines = section.split(/\n/);


    for (let i = 0; i < lines.length; i++) {

        const match = lines[i].match(
            /^\s*\d+[\.\)]\s+(.+)/
        );


        if (!match) {
            continue;
        }


        const question = match[1].trim();


        if (question.length < 3) {
            continue;
        }


        questions.push(question);


        if (questions.length >= 4) {
            break;
        }

    }


    return questions;

}


function saveClarificationState() {

    chrome.storage.local.set({
        clarifications:
            clarificationInput.value,
        clarificationQuestions:
            clarificationQuestions,
        clarificationIndex:
            clarificationIndex,
        lastAnalysisForQuestions:
            lastAnalysisForQuestions
    });

}


function renderClarificationUI() {

    if (!questionText || !submitAnswerBtn) {
        return;
    }


    if (clarificationQuestions.length === 0) {

        if (questionProgress) {
            questionProgress.textContent = "";
        }

        questionText.textContent =
            lastAnalysisForQuestions
                ? "No clarification required."
                : "Clarification questions will appear here after analysis.";

        if (answerInput) {
            answerInput.style.display = "none";
        }

        submitAnswerBtn.style.display = "none";
        submitAnswerBtn.disabled = true;

        if (clarificationDone) {
            clarificationDone.textContent = "";
        }

        return;

    }


    if (
        clarificationIndex >=
        clarificationQuestions.length
    ) {

        if (questionProgress) {
            questionProgress.textContent = "";
        }

        questionText.textContent = "";

        if (answerInput) {
            answerInput.style.display = "none";
            answerInput.value = "";
        }

        submitAnswerBtn.style.display = "none";
        submitAnswerBtn.disabled = true;

        if (clarificationDone) {
            clarificationDone.textContent =
                "All clarification questions answered.";
        }

        return;

    }


    if (questionProgress) {
        questionProgress.textContent =
            "Question " +
            (clarificationIndex + 1) +
            " of " +
            clarificationQuestions.length;
    }


    questionText.textContent =
        clarificationQuestions[clarificationIndex];


    if (answerInput) {
        answerInput.style.display = "";
    }


    submitAnswerBtn.style.display = "";
    submitAnswerBtn.disabled = false;


    if (clarificationDone) {
        clarificationDone.textContent = "";
    }

}


function startClarificationFromAnalysis(analysisText) {

    if (
        !analysisText ||
        analysisText === lastAnalysisForQuestions
    ) {
        renderClarificationUI();
        return;
    }


    lastAnalysisForQuestions = analysisText;

    clarificationQuestions =
        extractClarificationQuestions(
            analysisText
        );

    clarificationIndex = 0;

    clarificationInput.value = "";

    if (answerInput) {
        answerInput.value = "";
    }


    saveClarificationState();

    renderClarificationUI();

}


function submitCurrentClarificationAnswer() {

    if (
        clarificationIndex >=
        clarificationQuestions.length
    ) {
        return;
    }


    const answer =
        (answerInput &&
            answerInput.value.trim()) ||
        "";


    if (!answer) {
        alert("Please enter an answer.");
        return;
    }


    const question =
        clarificationQuestions[clarificationIndex];


    const block =
        "Question: " +
        question +
        "\nAnswer: " +
        answer;


    if (clarificationInput.value.trim()) {
        clarificationInput.value =
            clarificationInput.value.trim() +
            "\n\n" +
            block;
    } else {
        clarificationInput.value = block;
    }


    clarificationIndex =
        clarificationIndex + 1;


    if (answerInput) {
        answerInput.value = "";
    }


    saveClarificationState();

    renderClarificationUI();

}


// ========================================
// ANALYSIS STATUS TEXT
// ========================================

function getStatusLabel(liveAnalysis, hasTranscript) {

    const status =
        liveAnalysis &&
        liveAnalysis.status;


    if (status === "analyzing") {
        return "Analyzing";
    }

    if (status === "waiting") {
        return "Waiting for 10 seconds";
    }

    if (status === "complete") {
        return "Analysis complete";
    }

    if (status === "error") {
        return "Error";
    }

    if (!hasTranscript) {
        return "Waiting for captions";
    }

    return "Waiting for captions";

}


function applyLiveAnalysis(liveAnalysis, hasTranscript) {

    if (!analysisStatus) {
        return;
    }


    analysisStatus.textContent =
        getStatusLabel(
            liveAnalysis,
            hasTranscript
        );


    if (
        liveAnalysis &&
        liveAnalysis.status === "complete" &&
        liveAnalysis.analysis
    ) {

        analysisOutput.textContent =
            liveAnalysis.analysis;

        startClarificationFromAnalysis(
            liveAnalysis.analysis
        );

    }


    if (
        liveAnalysis &&
        liveAnalysis.status === "analyzing"
    ) {

        analysisOutput.textContent =
            "AI is analyzing transcript...";

    }


    if (
        liveAnalysis &&
        liveAnalysis.status === "error"
    ) {

        analysisOutput.textContent =
            "Error: " +
            (liveAnalysis.error ||
                "Automatic analysis failed.");

    }

}


function applyLiveTranscript(data) {

    let transcriptText = "";


    if (
        Array.isArray(data.liveTranscript) &&
        data.liveTranscript.length > 0
    ) {

        transcriptText =
            data.liveTranscript.join("\n");

    } else if (data.transcript) {

        transcriptText = data.transcript;

    }


    transcriptInput.value = transcriptText;


    applyLiveAnalysis(
        data.liveAnalysis,
        Boolean(transcriptText)
    );

}


async function refreshLiveDisplay() {

    chrome.storage.local.get(
        [
            "liveTranscript",
            "liveAnalysis",
            "transcript",
            "analysis"
        ],
        (data) => {

            applyLiveTranscript(data);


            if (
                data.liveAnalysis &&
                data.liveAnalysis.status ===
                    "complete" &&
                data.liveAnalysis.analysis
            ) {

                analysisOutput.textContent =
                    data.liveAnalysis.analysis;

                return;

            }


            if (
                data.analysis &&
                (
                    !data.liveAnalysis ||
                    data.liveAnalysis.status !==
                        "analyzing"
                )
            ) {

                if (
                    analysisOutput.textContent ===
                        "No analysis yet." ||
                    analysisOutput.textContent ===
                        "AI is analyzing transcript..."
                ) {

                    analysisOutput.textContent =
                        data.analysis;

                }

            }

        }
    );

}


// ========================================
// LOAD LIVE TRANSCRIPT FROM CURRENT TAB
// ========================================

async function loadLiveTranscript() {

    try {

        const tabs =
            await chrome.tabs.query({

                active: true,

                currentWindow: true

            });


        if (
            !tabs ||
            !tabs[0]
        ) {

            return;

        }


        chrome.tabs.sendMessage(

            tabs[0].id,

            {

                action:
                    "getLiveTranscript"

            },

            (response) => {

                if (
                    chrome.runtime.lastError
                ) {

                    return;

                }


                if (
                    response &&
                    response.success &&
                    response.transcript
                ) {

                    transcriptInput.value =
                        response.transcript;


                    chrome.storage.local.set({

                        transcript:
                            response.transcript

                    });

                }

            }

        );

    } catch (error) {

        console.log(
            "Live transcript not available:",
            error
        );

    }

}


// ========================================
// LOAD SAVED DATA WHEN POPUP OPENS
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        chrome.storage.local.get(
            [
                "transcript",
                "liveTranscript",
                "liveAnalysis",
                "clarifications",
                "clarificationQuestions",
                "clarificationIndex",
                "lastAnalysisForQuestions",
                "analysis",
                "requirements",
                "evaluation"
            ],

            (data) => {

                if (data.clarifications) {
                    clarificationInput.value =
                        data.clarifications;
                }

                if (
                    Array.isArray(
                        data.clarificationQuestions
                    )
                ) {
                    clarificationQuestions =
                        data.clarificationQuestions;
                }

                if (
                    Number.isInteger(
                        data.clarificationIndex
                    )
                ) {
                    clarificationIndex =
                        data.clarificationIndex;
                }

                lastAnalysisForQuestions =
                    data.lastAnalysisForQuestions ||
                    "";

                applyLiveTranscript(data);

                if (
                    data.analysis &&
                    (
                        !data.liveAnalysis ||
                        data.liveAnalysis.status !==
                            "error"
                    )
                ) {
                    analysisOutput.textContent =
                        data.analysis;
                }

                if (
                    data.liveAnalysis &&
                    data.liveAnalysis.status ===
                        "complete" &&
                    data.liveAnalysis.analysis
                ) {
                    analysisOutput.textContent =
                        data.liveAnalysis.analysis;
                }

                applyLiveAnalysis(
                    data.liveAnalysis,
                    Boolean(
                        transcriptInput.value
                    )
                );

                if (
                    analysisOutput.textContent &&
                    analysisOutput.textContent !==
                        "No analysis yet." &&
                    analysisOutput.textContent !==
                        "AI is analyzing transcript..." &&
                    analysisOutput.textContent.indexOf(
                        "Error:"
                    ) !== 0
                ) {
                    startClarificationFromAnalysis(
                        analysisOutput.textContent
                    );
                }

                renderClarificationUI();

                if (data.requirements) {
                    requirementsOutput.textContent =
                        data.requirements;
                }

                if (data.evaluation) {
                    evaluationOutput.textContent =
                        data.evaluation;
                }

                loadLiveTranscript();

            }
        );

    }
);


// Update popup when captions or analysis are stored
chrome.storage.onChanged.addListener(
    (changes, areaName) => {

        if (areaName !== "local") {
            return;
        }

        if (
            changes.liveTranscript ||
            changes.liveAnalysis ||
            changes.transcript ||
            changes.analysis
        ) {

            refreshLiveDisplay();

        }

    }
);


// ========================================
// AUTO SAVE CLARIFICATIONS
// ========================================

clarificationInput.addEventListener(
    "input",
    () => {

        chrome.storage.local.set({
            clarifications:
                clarificationInput.value
        });

    }
);


if (submitAnswerBtn) {

    submitAnswerBtn.addEventListener(
        "click",
        () => {

            submitCurrentClarificationAnswer();

        }
    );

}


// ========================================
// CAPTURE TRANSCRIPT FROM CURRENT PAGE
// ========================================

captureBtn.addEventListener(
    "click",
    async () => {

        captureBtn.textContent =
            "Capturing...";

        try {

            const tabs =
                await chrome.tabs.query({

                    active: true,
                    currentWindow: true

                });


            const tab = tabs[0];


            chrome.tabs.sendMessage(

                tab.id,

                {
                    action:
                        "captureTranscript"
                },

                (response) => {

                    captureBtn.textContent =
                        "Capture Page";


                    if (
                        chrome.runtime.lastError
                    ) {

                        alert(
                            "Open the Google Meet tab (with Live Captions on) so the extension can read captions."
                        );

                        return;

                    }


                    if (
                        response &&
                        response.success
                    ) {

                        transcriptInput.value =
                            response.transcript;


                        chrome.storage.local.set({

                            transcript:
                                response.transcript

                        });


                    } else {

                        alert(
                            "No live captions found. Turn on Live Captions in Google Meet and speak, then try again."
                        );

                    }

                }

            );

        } catch (error) {

            captureBtn.textContent =
                "Capture Page";


            alert(
                "Could not capture transcript: " +
                error.message
            );

        }

    }
);




// ========================================
// ANALYZE TRANSCRIPT
// ========================================

analyzeBtn.addEventListener(
    "click",
    async () => {

        const transcript =
            transcriptInput.value.trim();


        if (!transcript) {

            alert(
                "No live transcript yet. Open a Google Meet call and turn on Live Captions."
            );

            return;

        }


        analysisOutput.textContent =
            "AI is analyzing transcript...";


        try {

            const response =
                await fetch(

                    `${BACKEND_URL}/analyze-transcript`,

                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                transcript:
                                    transcript

                            })

                    }

                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(

                    data.detail ||
                    "Analysis failed"

                );

            }


            analysisOutput.textContent =
                data.analysis;


            chrome.storage.local.set({

                analysis:
                    data.analysis

            });


            startClarificationFromAnalysis(
                data.analysis
            );


        } catch (error) {

            analysisOutput.textContent =
                "Error: " +
                error.message;

        }

    }
);


// ========================================
// PARSE CLARIFICATIONS
// ========================================

function parseClarifications(text) {

    const clarifications = [];


    const blocks =
        text.split(/\n\s*\n/);


    blocks.forEach((block) => {

        const questionMatch =
            block.match(
                /Question:\s*(.*)/i
            );


        const answerMatch =
            block.match(
                /Answer:\s*(.*)/i
            );


        if (
            questionMatch &&
            answerMatch
        ) {

            clarifications.push({

                question:
                    questionMatch[1].trim(),

                answer:
                    answerMatch[1].trim()

            });

        }

    });


    return clarifications;

}


// ========================================
// GENERATE REQUIREMENTS
// ========================================

generateBtn.addEventListener(
    "click",
    async () => {

        const transcript =
            transcriptInput.value.trim();


        if (!transcript) {

            alert(
                "No live transcript yet. Open a Google Meet call and turn on Live Captions."
            );

            return;

        }


        const clarifications =
            parseClarifications(
                clarificationInput.value
            );


        requirementsOutput.textContent =
            "AI is generating requirements...";


        try {

            const response =
                await fetch(

                    `${BACKEND_URL}/generate-requirements`,

                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                transcript:
                                    transcript,

                                clarifications:
                                    clarifications

                            })

                    }

                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(

                    data.detail ||
                    "Requirement generation failed"

                );

            }


            requirementsOutput.textContent =
                data.requirements;


            chrome.storage.local.set({

                requirements:
                    data.requirements

            });


        } catch (error) {

            requirementsOutput.textContent =
                "Error: " +
                error.message;

        }

    }
);


// ========================================
// COMPARE AND EVALUATE
// ========================================

evaluateBtn.addEventListener(
    "click",
    async () => {

        const transcript =
            transcriptInput.value.trim();


        if (!transcript) {

            alert(
                "No live transcript yet. Open a Google Meet call and turn on Live Captions."
            );

            return;

        }


        const clarifications =
            parseClarifications(
                clarificationInput.value
            );


        evaluationOutput.textContent =
            "AI is comparing requirements...";


        try {

            const response =
                await fetch(

                    `${BACKEND_URL}/evaluate`,

                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                transcript:
                                    transcript,

                                clarifications:
                                    clarifications

                            })

                    }

                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(

                    data.detail ||
                    "Evaluation failed"

                );

            }


            requirementsOutput.textContent =

                "WITHOUT CLARIFICATION\n\n" +

                data.without_clarification +

                "\n\n" +

                "====================================\n\n" +

                "WITH CLARIFICATION\n\n" +

                data.with_clarification;


            evaluationOutput.textContent =
                data.evaluation;


            chrome.storage.local.set({

                requirements:
                    requirementsOutput.textContent,

                evaluation:
                    data.evaluation

            });


        } catch (error) {

            evaluationOutput.textContent =
                "Error: " +
                error.message;

        }

    }
);


// ========================================
// GET EXPORT DATA
// ========================================

function getExportData() {

    return {

        transcript:
            transcriptInput.value,

        analysis:
            analysisOutput.textContent,

        clarifications:
            clarificationInput.value,

        requirements:
            requirementsOutput.textContent,

        evaluation:
            evaluationOutput.textContent

    };

}


// ========================================
// EXPORT REPORT
// ========================================

async function exportReport(format) {

    try {

        const exportData =
            getExportData();


        if (!exportData.transcript.trim()) {

            alert(
                "Please add a transcript before exporting."
            );

            return;

        }


        const response =
            await fetch(

                `${BACKEND_URL}/export/${format}`,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            exportData
                        )

                }

            );


        if (!response.ok) {

            let errorMessage =
                "Export failed";


            try {

                const error =
                    await response.json();


                errorMessage =
                    error.detail ||
                    errorMessage;

            } catch {
                // Keep default message
            }


            throw new Error(
                errorMessage
            );

        }


        const blob =
            await response.blob();


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement("a");


        link.href = url;


        link.download =
            `AI_Requirement_Analyzer_Report.${format}`;


        document.body.appendChild(
            link
        );


        link.click();


        document.body.removeChild(
            link
        );


        URL.revokeObjectURL(
            url
        );


    } catch (error) {

        alert(
            "Export Error: " +
            error.message
        );

    }

}


// ========================================
// EXPORT BUTTONS
// ========================================

exportTxtBtn.addEventListener(
    "click",
    () => {

        exportReport("txt");

    }
);


exportDocxBtn.addEventListener(
    "click",
    () => {

        exportReport("docx");

    }
);


exportPdfBtn.addEventListener(
    "click",
    () => {

        exportReport("pdf");

    }
);


// ========================================
// CLEAR ALL DATA
// ========================================

clearBtn.addEventListener(
    "click",
    () => {

        const confirmClear =
            confirm(
                "Clear all saved project data?"
            );


        if (!confirmClear) {

            return;

        }


        transcriptInput.value = "";

        clarificationInput.value = "";

        if (answerInput) {
            answerInput.value = "";
        }

        clarificationQuestions = [];
        clarificationIndex = 0;
        lastAnalysisForQuestions = "";
        renderClarificationUI();


        analysisOutput.textContent =
            "No analysis yet.";


        requirementsOutput.textContent =
            "Requirements will appear here.";


        evaluationOutput.textContent =
            "Evaluation will appear here.";


        if (analysisStatus) {

            analysisStatus.textContent =
                "Waiting for captions";

        }


        chrome.tabs.query(
            {
                url: [
                    "https://meet.google.com/*",
                    "https://*.zoom.us/*",
                    "https://app.zoom.us/*"
                ]
            },
            (tabs) => {

                if (!tabs) {
                    return;
                }

                tabs.forEach((tab) => {

                    chrome.tabs.sendMessage(
                        tab.id,
                        {
                            action:
                                "clearLiveTranscript"
                        },
                        () => {
                            void chrome.runtime.lastError;
                        }
                    );

                });

            }
        );


        chrome.storage.local.clear();

    }
);