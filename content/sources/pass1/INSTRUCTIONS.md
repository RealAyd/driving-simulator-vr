# Pass 1: how each batch is run

Light pass over every test centre (see `content/packs/EVIDENCE_PLAN.md`, sections 2 to 5 and 8). For each centre:
count the public sources about its driving test roads. **Search results only: no page is opened, read in depth or
copied.** Record links, sites and kinds; nothing else from a page.

## For each centre in your batch file

1. Run these two searches (WebSearch, mode "standard"), with the centre's name as given:
   - `"<name> driving test" route roads roundabout`
   - `"<name>" driving test centre tips mock test route video OR reddit OR forum`
2. From the result links, keep those about **this** centre's driving test roads (car tests). Drop: other centres,
   motorcycle/HGV-only pages, national guides, pass-rate-only pages, booking sites.
3. Give each kept link one kind:
   - `instructor-page`: a local driving school's or instructor's own page about this centre's test or test area
   - `video`: a video of a drive round this centre's test area (title and link only)
   - `learner`: a forum or Reddit post by someone who took a test there
   - `route-list`: a free page listing turn-by-turn "test routes" for this centre
   - `template`: near-identical pages a site has for many towns (count once per site, as weak)
   - `news`: local news or council notice about the centre (a move, closure, roadworks)
   - `paid`: routes sold for money (recorded, never used, scores 0)
4. Count each **site** once per kind (two pages from one school count once).
5. If any result shows the centre has moved, or the pages describe an older address, note it in `moved`.

## Score (EVIDENCE_PLAN section 5)

- 2 points per separate `instructor-page`, `video` or `learner` source; 1 per `route-list`, `template` or `news`;
  0 for `paid`.
- At most 5 points from any one kind.
- A source clearly about an old address before a move scores half.

## Output

Write `content/sources/pass1/out/batch-NN.json` (same NN as your input), a JSON array, one object per centre, in
input order:

```json
{"name":"Chelmsford","postcode":"CM1 3BB","tests":9000,
 "score":7,
 "counts":{"instructor-page":1,"video":0,"learner":1,"route-list":2,"template":1,"news":0,"paid":1},
 "sources":[{"kind":"route-list","site":"drivingtesttips.biz","url":"https://…"}],
 "moved":"Pages describe Hanbury Road; the centre moved to Cromar Way in Oct 2026",
 "searched":"2026-11-15"}
```

`moved` is null when nothing suggests a move. Write the file as you go (after every few centres) so work is not lost.
Do not commit; do not edit any other file.
