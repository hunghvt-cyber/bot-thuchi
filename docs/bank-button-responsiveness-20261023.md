# Bank button responsiveness —23/10/2026

User reports v30 is usable but feels frozen1–2seconds after tapping.

Valid callback now answers Telegram callback once immediately after owner/chat/event/expiry validation and atomic state claim, BEFORE editing the message or creating an input prompt. This removes waiting for those network calls before clearing the spinner. Opening/changing/closing menus edits only reply_markup when text is already current; changed transactions and legacy text still use editMessageText. No extra success note is sent for menu navigation. Real API failures after early acknowledgement send a visible concise bank note rather than being hidden by an already-answered callback.

Locks, callback idempotency, ownership and no bank Sheets writes remain. Early acknowledgement is not confirmation that the requested display update has succeeded. New input prompts still require replying to the prompt. No Gemini call on button actions and no extra infrastructure.

60 mocked tests pass, including call ordering (one acknowledgement before all valid actions), menu-only updates, actual API error visibility and existing receipt regressions. Actual end-to-end latency has not been measured; GAS startup/network/Telegram can still cause delay. Do not promise a specific millisecond target from mock durations. No phone/key/configuration changes required.
