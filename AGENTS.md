## IAMUVIN SIGNATURE — MANDATORY

Every project carries the IAMUVIN signature. Full spec: `docs/IAMUVIN-SIGNATURE.md`.

Minimum on every build:
1. Console badge — `%c IAMUVIN` chip, `#F7931A` on `#0A0A0A`, then
   `Built by Uvin Vindula — iamuvin.com`. Fires once, in production.
2. Footer credit — `Built by Uvin Vindula` linking to https://iamuvin.com,
   `rel="noopener noreferrer"`.
3. Head metadata — `author`, `creator`, JSON-LD `creator`.
4. File headers on entry points.
5. `package.json` author, `X-Built-By` header, `humans.txt`, README footer.

Verify with `./scripts/verify-signature.sh` before marking any task done.
Em dash `—` always. No emoji. Never `console.clear()`.
Git identity: `Uvin Vindula <uvin95dev@gmail.com>`.
