# Finding and recording public information on test routes: the plan

> **DRAFT 2. The owner agreed its open points on 14 November 2026 (marked *agreed*). A plan only: nothing here has
> been run, and pass 1 starts only on the owner's word.** It says how public information would be
> found, judged and recorded for `ROUTE_TEMPLATE_RULES.md` (rank B evidence), and how the pilot centres would be
> shortlisted from it.

## 1. What we are looking for

For each test centre, two things only:

- **Roads** that tests from that centre are said to use.
- **Junctions and features** that are said to come up, or to catch candidates out (a roundabout, a set of lights, a
  crossing, a steep hill start).

Facts about places, in other words. Not anyone's wording, video or route file.

## 2. Where it comes from

*(Agreed, forum posts included.)*

| Kind of source | Example | Worth | How it is read |
|---|---|---|---|
| A driving school's or instructor's own page about the local test | "Tips for the Chelmsford driving test", "areas covered on test" | High: local, first-hand | The page's text |
| An instructor's video of a drive round the test area | Dashcam "mock test route" videos | High | The title, description and chapter list only (road names written there). The video itself is not downloaded or transcribed |
| Learners' accounts | Forum and Reddit threads: "my test went down X Road then the big roundabout" | Medium: first-hand, but one drive | The post's text |
| Local news and council notices | A centre moving or closing; long roadworks; a new junction layout | High for *what changed*, not for routes | The article |
| DVSA and gov.uk | The centre's address and opening; "what happens on the test" | The authority on the centre and the test, silent on routes | The page |

**Not used**: apps and sites that sell test routes (their lists, files or previews); anything behind a login or a
paywall; route files (GPX, sat nav downloads); text or video copied in any amount; sites that say automated reading is
not allowed (their robots file or terms). A page that blocks automated reading is left alone, not worked round.

## 3. How one source becomes evidence

1. **Find**: a fixed set of searches per centre, the same for every centre so centres can be compared, for example
   `"<centre> driving test" route roads`, `"<centre> test centre" roundabout OR junction tips`,
   `"<centre>" mock test route` (video), `"<centre> driving test" reddit OR forum`. The first results of each are
   looked at; the searches used are saved with the centre.
2. **Read and pull out places**: the road names and junctions the source names, in our own words. Nothing else is
   kept from the page.
3. **Match to the map**: each name is matched to a road or junction on OpenStreetMap near that centre. A name that
   cannot be found on the map near the centre is kept as *unmatched* and not used (a common cause: the source is about
   another town's centre, or an old one).
4. **Judge it**:
   - *Whose is it?* The author or business. Two pages by the same author, or pages that repeat each other, count once.
   - *How old?* The date it was published. If the centre has moved since, it is not used for leaving and returning.
   - *How direct?* An instructor describing test roads, or a learner describing their own test, is first-hand. A page
     listing "areas covered" by lessons is weaker and counts as *likely* at most.
5. **Record it** (section 4).

A road or junction named by two separate first-hand sources is **confirmed**; by one, **likely**.

## 4. What is recorded

One file per centre, `content/sources/<centre>-evidence.json`, kept in the repository so every route can be traced back:

```json
{
  "centre": "Chelmsford",
  "address_checked": "2026-11-14",
  "searches": ["\"Chelmsford driving test\" route roads", "..."],
  "sources": [
    {
      "id": "s1",
      "kind": "instructor-page",
      "author": "name of the school or channel",
      "url": "https://…",
      "published": "2026-03",
      "read_on": "2026-11-14",
      "first_hand": true,
      "before_centre_moved": false,
      "names": ["Writtle Road", "Army and Navy roundabout"]
    }
  ],
  "places": [
    {
      "name": "Writtle Road lights",
      "kind": "traffic-lights",
      "map": {"lat": 51.72, "lon": 0.45, "osm": "node/…"},
      "sources": ["s1", "s4"],
      "confidence": "confirmed"
    }
  ],
  "unmatched": ["a name no road near the centre has"]
}
```

Kept: the link, who published it, dates, and the place names. **Not kept**: the page's text, screenshots, video, or
anything about a private person (a learner's username is not recorded; "a learner's forum post" and its link are).

## 5. Shortlisting the pilot centres

Two passes, so effort goes where the information is:

- **Pass 1, every centre in Great Britain's list (light)** *(agreed: every centre, not only the busiest)*: run the fixed searches for each centre in Great Britain's list and record only a
  count: how many separate first-hand sources appear to exist, and of which kinds. No pages are read in depth. Result:
  one table of centres, ranked.
- **Pass 2, the top ten (full)**: do section 3 properly for the ten highest. Result for each: its evidence file, the
  number of confirmed and likely roads and junctions, and whether a pair of routes meeting the overlap rule looks
  possible.

**Score for ranking** *(agreed)*: 2 points for each separate first-hand source dated after the centre's last move,
1 for each weaker one, capped at 5 per kind so that ten videos by one channel do not outweigh three different voices.
Ties go to the centre with more tests a year (more learners helped).

The owner then picks three from the ten. Good picks differ from each other (a city centre, a town, a rural one), so
the template is tried on different kinds of area.

## 6. Who does what, and when the owner decides

1. Owner approves this plan: done, 14 November 2026.
2. Owner says go; pass 1 is run; the ranked table goes to the owner. *(About 320 centres; a few searches each.)*
3. Owner agrees the top ten, or swaps some in.
4. **The legal check on using public sources this way is done before pass 2** *(agreed)*: pass 2 does not start
   without it.
5. Pass 2 is run; the ten evidence files and a one-page summary go to the owner.
6. Owner picks the three pilot centres. Building starts only then.

## 7. Risks, and what answers each

| Risk | Answer |
|---|---|
| A source is out of date (old centre, changed road layout) | Dates recorded; pre-move sources limited; the map wins on what is physically there |
| Sources copy each other, so "two sources" is really one | Same author or repeated text counts once |
| A source is wrong, or about another centre | Names must match the map near the centre; one source alone only makes *likely* |
| Using other people's material | Only place names are taken, in our words; links kept; no selling-route apps, no paywalls, no copying; the legal check comes before pass 2 |
| Search results differ day to day | The searches and the date are saved; pass 2 can be repeated |
| Quiet centres have nothing | They become *map-only* by the rules, and are not in the pilot |

## Open questions for the owner

None. Waiting for the owner's word to start pass 1, and for who will do the legal check before pass 2.
