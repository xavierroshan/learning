# Structure prompts with XML tags

Use descriptive XML tags to separate instructions, source material, and output requirements when prompting Claude and other LLMs. This is especially useful for complex prompts with pasted documents. Anthropic recommends XML tags for helping Claude distinguish these parts clearly. Treat tags as a useful default for structured prompts; the best format depends on the model and task. [Anthropic prompting guidance](https://platform.claude.com/docs/claude/use-xml-tags)

## Example contract summary prompt

```xml
<instructions>
Summarize the contract below for a non-lawyer. Flag any auto-renewal clauses.
</instructions>

<contract>
...pasted contract text...
</contract>

<output_format>
3-sentence summary, then a bulleted list of risks.
</output_format>
```

## Why this structure helps

- `<instructions>` defines the task and intended audience.

- `<contract>` marks the source text to analyze.

- `<output_format>` specifies the response structure.

Use consistent, descriptive tag names and close each tag. Replace the placeholder with the actual contract before submitting the prompt.

# Let the model think before answering

For reasoning, analysis, math, or decisions, ask the model to work through the problem before giving its answer. This can improve quality, depending on the model and task.

## Example prompts

- **Simple:** “Think through this step by step before giving your answer.”

- **Structured:** “First, list the relevant facts in `<analysis>` tags. Then give your recommendation in `<answer>` tags.”

The structured version separates the supporting facts from the recommendation, making the response easier to review.

## Adapt to the model

Reasoning models already reason internally, so an explicit “think step by step” instruction may be unnecessary. For these models, give a clear goal and constraints, and request a concise explanation of the key facts, assumptions, and conclusion. [OpenAI reasoning best practices](https://developers.openai.com/api/docs/guides/reasoning-best-practices)

# Assign a role to guide the response

Assign the model a role that fits your task, such as a tutor, editor, project manager, or critical reviewer. A role helps specify the perspective, tone, and priorities you want. Pair it with a clear task, audience, constraints, and output format. OpenAI’s prompting guidance recommends defining the assistant’s purpose, communication style, and goals alongside explicit instructions. [OpenAI prompt engineering guide](https://developers.openai.com/api/docs/guides/prompt-engineering)

## Example prompts

- **Tutor:** “Act as a patient math tutor. Explain fractions to a beginner using a pizza example, then ask one practice question.”

- **Editor:** “Act as a copy editor. Rewrite the text below for a general audience. Preserve its meaning, remove jargon, and keep it under 150 words.”

- **Critical reviewer:** “Act as a critical project reviewer. Review the plan below for missing dependencies, unrealistic assumptions, and delivery risks. Return the three most important issues and a suggested fix for each.”

## Combine a role with XML tags

```xml
<role>
Act as a project manager reviewing a launch plan for a small team.
</role>

<instructions>
Identify missing dependencies and scheduling risks.
Prioritize issues that could delay the launch.
Use only the supplied plan and flag missing information.
</instructions>

<plan>
...pasted launch plan...
</plan>

<output_format>
A table with columns: Risk, Impact, and Suggested action.
Then give your top recommendation in two sentences.
</output_format>
```

## Make the role specific

Describe what the role should do: “Review for unclear claims and unsupported conclusions” gives more direction than “Be an expert.” A role guides the response; it does not guarantee factual accuracy. Judge the result by how well it meets the task and uses the available evidence.

# Break big tasks into steps

Prompt chaining splits a large task into focused prompts, with each step using the previous step’s output. When a task involves several distinct activities, such as extraction, analysis, and writing, this makes each stage easier to review and refine.

## Example document to report workflow

1. **Prompt 1 — Extract:** “Extract the key data from the document below. Return a table of facts, figures, dates, and source locations. Mark missing information as unknown.”

2. **Prompt 2 — Analyze:** “Using the extracted data below, identify the main findings, patterns, and gaps. Distinguish supported conclusions from assumptions.”

3. **Prompt 3 — Write:** “Using the analysis below, write a report for a nontechnical audience. Include a short summary, key findings, and recommendations. Preserve source references and uncertainty.”

## Pass results between steps

Include the previous step’s output in the next prompt, using clear labels or tags such as `<extracted_data>` and `<analysis>`. Carry forward the relevant source references and constraints, and check each output before continuing so errors do not spread into the final report.

# Ground answers in long documents

When asking questions about a long document, make the source material easy to locate and require evidence for the answer.

- **Put long documents near the top:** Place the document before the task instructions and put your question at the end. Try this ordering for long inputs; its effectiveness depends on the model and task.

- **Ask for supporting quotes first:** “Find the passages relevant to the question, quote them, then answer using only those quotes.” This makes the evidence visible and can help reduce unsupported claims.

- **Give permission not to know:** “If the document doesn’t contain the answer, say so.” Make this fallback explicit so the model has a clear alternative to guessing.

## Example document question prompt

```xml
<document>
...pasted document text...
</document>

<instructions>
Find the passages relevant to the question and quote them exactly.
Include page numbers or section names when available.
Then answer using only those quotes.
If the document does not contain enough information to answer,
say so and identify what is missing. Do not guess.
</instructions>

<output_format>
Supporting quotes with source locations, followed by a concise answer.
</output_format>

<question>
...your question...
</question>
```

Check that each quote appears in the document and supports the conclusion drawn from it.

# The anatomy of a strong prompt

Not every prompt needs every part, but this is a reliable checklist for anything important:

| Part | Example |
| --- | --- |
| **Role** (optional) | “You are an experienced technical program manager.” |
| **Task** | “Write a status update for the CI/CD lab project.” |
| **Context** | “The audience is a non-technical steering committee. Milestones 1–3 are done; SonarQube setup is blocked by a memory issue.” |
| **Why** | “They decide whether to fund two more weeks, so they need risks and options, not technical detail.” |
| **Constraints** | “Under 200 words. No jargon. Don’t speculate about dates we haven’t committed to.” |
| **Examples** (optional) | “Here’s a past update they liked: …” |
| **Output format** | “Three sections: Progress, Risks, Decision needed.” |