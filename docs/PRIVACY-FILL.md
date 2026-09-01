# Privacy notice — what still has to be supplied

The privacy notice is drafted and structured against Thailand's Personal Data
Protection Act B.E. 2562 (2019). It is **a draft for legal review, not settled
legal text**.

**Seven of the original eleven values are now resolved and stated as fact.**
Four remain, and all four come off the company registration — nothing else can
supply them.

## Resolved

| Was | Now | How |
| --- | --- | --- |
| Hosting provider and country | Hostinger International Limited, **Singapore** | `dig jomtien.net` → 179.61.189.43 / 77.37.48.93, both AS47583 Hostinger, Singapore |
| Email provider and country | Hostinger, **Singapore** | MX records are `mx1/mx2.hostinger.com` |
| Cross-border transfer | **Yes**, Thailand → Singapore, s.28 appropriate safeguards via Hostinger's processing terms | follows from the two above |
| Server log retention | Hostinger's own policy; we neither extend nor copy | we do not control it, so we do not claim a number |
| Enquiries that go nowhere | 12 months from last contact | proposed and now stated — change it if you disagree |
| Project records | 5 years | Thai accounting law retention for business records |
| Rights-request response | 30 days | PDPA s.30 timeframe |

## Still outstanding — four values

Every one is marked in the page with a yellow `.fill` highlight, and
`npm run verify:launch` fails while any remains. Nothing here can be guessed —
a wrong retention period or a wrong controller name is a compliance defect, not
a typo.

## Where things stand

| | |
| --- | --- |
| Drafted against | PDPA s.23 (notice at collection), s.24 (lawful bases), ss.30–36 (data subject rights) |
| Files | `en/privacy/index.html`, `th/privacy/index.html` |
| Reviewed by a Thai practitioner | **No** |
| Thai text reviewed by a native speaker | **No** — see [`THAI-REVIEW.md`](THAI-REVIEW.md) |
| Live | No. Both pages carry `noindex` and a draft banner |

## The eleven values

1. **Registered legal entity name.** The exact name as it appears on the DBD
   record, including whether it reads "Company Limited", "Co., Ltd." or the
   Thai equivalent. The form shown in the current site footer is not
   authoritative — check the registration.
2. **Company registration number.**
3. **Registered office address.**

### A decision to take

4. **Data Protection Officer — appointed or not?** The PDPA requires one in
   defined circumstances. For a small studio it is likely not required, but
   "likely" is not an answer to put on a legal page. Ask counsel, then state
   the outcome either way.

### From the hosting and email providers

5. **Hosting provider name and the country the data sits in.**
6. **Email provider name and country.** This is the same decision as the
   contact form's delivery provider — settling one settles both.
7. **Do either store data outside Thailand?** If yes: name the destination
   countries and the transfer mechanism relied on under PDPA s.28 or s.29.
   Vendor location alone is not a mechanism.
8. **Server log retention period** — whatever the host actually applies.

### Retention decisions

9. **Enquiries that go nowhere.** Proposed: 12 months from last contact.
10. **Records for projects that proceed.** Driven by Thai accounting and tax
    retention requirements — your accountant, not your lawyer, answers this one.
11. **Response window for a rights request.** Proposed: 30 days.

## What the draft already asserts, and why

These are not blanks. They are claims made because the code makes them true —
but they must stay true, so check them if the site changes.

- **No cookies, no analytics, no third-party resources.** The CSP in `_headers`
  is `default-src 'self'` with no exceptions, which enforces it. Adding any
  external script or font breaks both the CSP and this claim.
- **Form contents never reach analytics, console, or application logs.** True
  in `src/main.ts` today. It must remain true when the delivery provider is
  wired in.
- **Enquiries are not used to train models and are not sent to third-party AI
  services.** Currently true because nothing is sent anywhere at all.
- **Lawful bases.** The draft relies on s.24(3) (pre-contractual steps at the
  data subject's request) for enquiries and scoping, s.24(5) (legitimate
  interest) for site security, and s.24(6) (legal obligation) for accounting
  records. **This is the analysis to put in front of counsel.** It is drafted
  to be reviewed, not to be relied on.
- **Breach notification.** The draft commits to notifying the PDPC without
  undue delay and, where feasible, within 72 hours of becoming aware. Confirm
  the operational path exists before promising it in public.

## Order of work

1. Owner supplies items 1–3 and 9–11.
2. Hosting and email decision settles items 5–8. This is the same decision as
   `CONTACT_PROVIDER` for the contact form.
3. Counsel reviews the English text end to end and answers item 4.
4. **Only after the English is final**, the Thai gets translated properly. Do
   not have the Thai reviewed first — it would have to be redone.
5. Remove the draft banner and the `noindex` tag, run `npm run verify:all`.

## Sources used in drafting

Checked 2026-08-31. Verify against the PDPC's own text before publication —
these are secondary summaries, and a privacy notice should cite the Act.

- [Thailand PDPA overview — DLA Piper Data Protection Laws of the World](https://www.dlapiperdataprotection.com/index.html?t=law&c=TH)
- [Data subject rights, ss.30–42 — Thailand Law Library](https://library.siam-legal.com/thai-law/personal-data-protection-act-rights-of-the-data-subject-sections-30-42/)
- [PDPC clarification on breach notification — IAPP](https://iapp.org/news/a/thailand-s-pdpc-clarifies-data-breach-notification-requirements)
- [Breach notification criteria — DLA Piper Privacy Matters](https://privacymatters.dlapiper.com/2025/02/thailand-pdpc-clarification-on-personal-data-breach-notification/)
- [Lawful bases and legitimate interest guidance — Lexology](https://www.lexology.com/library/detail.aspx?g=2b077c78-ac3f-4eaf-a3a7-34782e7b83d3)
- [Personal Data Protection Committee](https://www.pdpc.or.th/)

---

Built by Uvin Vindula — [iamuvin.com](https://iamuvin.com)
