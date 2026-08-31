# Thai copy — review brief

**Status: NOT NATIVE-REVIEWED.** The Thai on this site was written by the
developer and corrected on a second pass. That is not the same as review by a
native speaker, and `PRD.md` line 266 requires one before production. This
document exists so that review takes an hour instead of a day.

Scope: `th/index.html`, `th/estimate/index.html`, `th/privacy/index.html`, and
the social card `assets/og/og-th.html`. 243 distinct Thai strings.

## What the reviewer is deciding

Not whether the grammar parses — it does. Three things:

1. **Does it sound like a Thai company wrote it**, or like English translated?
2. **Is the register right** — direct and professional, addressing a business
   owner as a peer. Not stiff-formal, not casual.
3. **Are the technical terms the ones the local market actually uses?**

## Already corrected on the second pass

These were caught and fixed. Worth confirming the replacements are right.

| Was | Now | Why |
| --- | --- | --- |
| `ไม่ได้จ้างต่อไปต่างประเทศ` | `ไม่ได้ส่งงานไปทำต่างประเทศ` | "offshore" had become a clumsy subcontracting phrase |
| `การเดาที่ติดตัวเลขมาด้วย` | `การเดาที่มีตัวเลขกำกับไว้` | direct calque of "a guess with a number attached" |
| `ทำเว็บเดิมที่มีอยู่ใหม่ได้ไหม` | `ทำเว็บไซต์เดิมขึ้นใหม่ได้ไหม` | two stacked modifiers read ambiguously |
| `เราจะประกาศราคา` | `เราจะแจ้งราคา` | "announce" is stiff for sending a quote |
| `ไล่ดูทีละข้อ รวม 6 ข้อ` | `ไล่ดูทีละข้อ ทั้งหมด 6 ข้อ` | natural quantifier |
| `ทั้งโลว์ซีซั่นและไฮซีซั่น` | `ทั้งช่วงโลว์ซีซั่นและไฮซีซั่น` | classifier before the loanwords |
| FAQ heading with no question particle | added `กันแน่` | every sibling FAQ heading has one |

## Highest-risk lines — check these first

Ranked by how much damage a bad rendering does.

1. **The `h1`** — `เว็บไซต์ ร้านค้าออนไลน์ และระบบที่ทำงานอยู่เบื้องหลัง`.
   First thing anyone reads. Does "ระบบที่ทำงานอยู่เบื้องหลัง" land as
   "the systems running behind them", or does it read as something hidden?
2. **The primary CTA** — `คุยเรื่องโปรเจกต์ของคุณ`. Is `โปรเจกต์` right for
   this market, or does `งาน` read better to a café owner?
3. **Every commercial sentence in the Engagement section.** Anything about
   price, scope, or terms. A soft mistranslation here becomes a contractual
   argument later.
4. **`จุดอนุมัติ`** (approval gate), used four times in Process. Is this the
   term the local market uses, or is `จุดตรวจรับ` clearer?
5. **`เก็บความต้องการ`** for Discovery, used throughout. Consistent and
   standard, but confirm it is not too IT-department for a small business.
6. **The ownership FAQ** — `ใครเป็นเจ้าของโค้ด โดเมน บัญชี และข้อมูล`. Legally
   loaded. The answer must not imply a term the contract does not grant.
7. **The AI section** — `ตอบจากแหล่งที่ค้นเจอจริงแทนการเดา`. This is a
   capability claim. It must not over-promise.

## Deliberate choices, not errors

Please do not "fix" these without asking:

- **No `ครับ/ค่ะ` particles.** The register is written-formal, not spoken.
- **Loanwords kept** where the market uses them: `เว็บไซต์`, `แอปพลิเคชัน`,
  `โฮสติ้ง`, `แดชบอร์ด`, `โลว์ซีซั่น`. Native coinages would read stiffer.
- **`Jomtien Network` stays in Latin script** throughout — it is the
  registered brand.
- **No uppercase and no wide letter-spacing on Thai.** The stylesheet enforces
  this (`[lang="th"] .u-caps`), so Thai eyebrow labels look different from
  their English counterparts on purpose.
- **Em dash `—`** is used, not a hyphen.

## How to return the review

Edit the three `th/**/index.html` files directly, or return a line-numbered
list. Either way, after any change:

```bash
npm run build && npm run verify:all
```

`verify:launch` checks locale section parity — English and Thai must keep the
same number of `<section>` elements, so do not delete a section on one side
only.

## Still outstanding regardless of language review

The Thai privacy page is a **draft describing code behaviour**, not legal text.
It needs a lawyer before it governs any real data collection, and the Thai
wording of that page should be reviewed only after the English legal text is
final.

---

Built by Uvin Vindula — [iamuvin.com](https://iamuvin.com)
