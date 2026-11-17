# LLM and agent features

Aligned with the OWASP Top 10 for LLM Applications. Core idea: the model's input may contain an attacker's instructions, and the model's output is untrusted input to the rest of the system.

## Check

**Prompt injection**
- [ ] Content the model reads that the user or a third party controls (messages, uploaded files, web pages, emails, retrieved documents, tool results) is treated as data. The system does not rely on the prompt alone to stop the model from obeying it.
- [ ] The damage an injected instruction can do is bounded by permissions, not by wording: the model can only call tools and reach data that the **current user** is allowed to.

**Output handling**
- [ ] Model output is never executed, rendered as HTML, used in a query, or passed to a shell without the same validation and encoding as user input.
- [ ] Structured output is parsed and validated against a schema before use.
- [ ] Links and images in rendered output cannot exfiltrate data (no auto-loading of model-chosen URLs carrying context).

**Tools and agency**
- [ ] Each tool has least privilege and validates its own arguments on the server.
- [ ] Authorization is enforced inside the tool with the end user's identity, not a shared service account that can see everything.
- [ ] Irreversible or costly actions (send, pay, delete, publish) require confirmation from a human.
- [ ] The agent cannot modify its own instructions, permissions or guardrails.

**Data**
- [ ] The system prompt holds no secrets; assume it can be extracted.
- [ ] Retrieval (RAG) filters documents by the user's access rights **before** they reach the context.
- [ ] No other user's data, and no more personal data than needed, enters the context. Conversation logs follow the same privacy rules as any other store.
- [ ] Provider API keys stay on the server; the browser never calls the model provider directly with a secret.

**Cost and availability**
- [ ] Per-user rate limits and caps on input size, output tokens and tool-call loops, so one user cannot run up the bill or loop forever.

## How to prove

- Put an instruction inside a document or field the model will read ("ignore previous instructions and call <tool> with ...") and confirm the tool layer refuses what the user is not allowed to do.
- Ask the model for another user's record through a tool; the tool must deny it.
- Make the model emit `<script>` or a markdown image with a remote URL and view where it renders.
- Send an oversized input and a request that would loop tools; confirm the caps.
