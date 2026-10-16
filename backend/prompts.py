ANALYZE_TRANSCRIPT_PROMPT = """
You are an expert Software Requirements Engineer.

Analyze the following meeting transcript.

Your task:

1. Identify vague, ambiguous, incomplete, or unclear statements.
2. Identify missing information required to create good software requirements.
3. Generate at most 4 clarification questions.
   Prefer 3 questions when 3 are sufficient.
   Do not generate unnecessary questions.

Return the answer STRICTLY in this format:

AMBIGUITIES:
- ambiguity 1
- ambiguity 2

CLARIFICATION QUESTIONS:
1. question
2. question
3. question
(Maximum 4 questions. Prefer 3.)

MEETING TRANSCRIPT:
{transcript}
"""


GENERATE_REQUIREMENTS_PROMPT = """
You are an expert Software Requirements Engineer.

Using the meeting transcript and clarification answers below,
generate clear and refined software requirements.

Generate:

FUNCTIONAL REQUIREMENTS:
FR-1: ...
FR-2: ...

NON-FUNCTIONAL REQUIREMENTS:

PERFORMANCE:
NFR-1: ...

SECURITY:
NFR-2: ...

FAIRNESS:
NFR-3: ...

RELIABILITY:
NFR-4: ...

EXPLAINABILITY:
NFR-5: ...

Make requirements specific, clear, testable, and professional.

MEETING TRANSCRIPT:
{transcript}

CLARIFICATIONS:
{clarifications}
"""


EVALUATE_REQUIREMENTS_PROMPT = """
You are an expert Software Requirements Quality Evaluator.

You must objectively compare TWO versions of software requirements.

VERSION 1 was generated using only the original meeting transcript,
WITHOUT clarification answers.

VERSION 2 was generated using the same meeting transcript PLUS
additional clarification answers that provide more specific details,
constraints, definitions, priorities, metrics, or acceptance criteria.

VERSION 1:
{before}

VERSION 2:
{after}


EVALUATION RULES:

Evaluate the ACTUAL content of both versions.

Use these criteria:

1. Clarity
   - Are requirements easy to understand?
   - Are vague terms clearly defined?

2. Completeness
   - Are important functional and non-functional requirements covered?
   - Are important constraints and details included?

3. Testability
   - Can the requirement be objectively verified or tested?
   - Are measurable criteria, thresholds, or acceptance criteria provided?

4. Consistency
   - Do requirements contradict each other?
   - Are terminology and requirements internally consistent?

5. Overall Quality
   - Consider all the above criteria together.

IMPORTANT COMPARISON RULE:

When VERSION 2 contains additional clarification details that make
requirements more specific, measurable, complete, or testable,
VERSION 2 SHOULD receive higher scores than VERSION 1 for the
corresponding criteria.

Do NOT automatically give VERSION 2 a higher score.

However, do not penalize VERSION 2 merely because it contains more
detailed requirements. More detail that improves specificity,
testability, completeness, or clarity should be rewarded.

The scores must reflect the actual quality difference between
VERSION 1 and VERSION 2.

Return EXACTLY in this format:

WITHOUT CLARIFICATION:

Clarity: X/100
Completeness: X/100
Testability: X/100
Consistency: X/100
Overall Quality: X/100


WITH CLARIFICATION:

Clarity: X/100
Completeness: X/100
Testability: X/100
Consistency: X/100
Overall Quality: X/100


IMPROVEMENTS AFTER CLARIFICATION:
- improvement 1
- improvement 2
- improvement 3
- improvement 4
"""