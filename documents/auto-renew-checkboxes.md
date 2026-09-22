# Auto-Renew Checkboxes

Three designs for the auto-renew membership question. A page only needs the
right class on the form block that holds the question.

| Design | Looks like | Sits |
| ------ | ---------- | ---- |
| `auto-renew-checkbox-1` | Icon, heading and toggle; the whole strip fills green when ticked and a "Thanks!" appears under the toggle | Spans the full column width |
| `auto-renew-checkbox-2` | Gray band with a green top rule, a big square checkbox and a photo rail on the right; ticking swaps the photo with a slide | Spans the full column width |
| `auto-renew-checkbox-3` | Quiet row with hairline dividers — icon, copy and a toggle whose knob grows a sprout when ticked | Inset with the other form fields |

## Setting up a page

There is no markup to paste. The designs restyle what EN already renders for
the checkbox question — the heading label, the opt-in item and the native
input, which each design turns into its toggle or box.

1. Create a form block with **one checkbox custom question** — your auto-renew
   question.
2. Add the design's class — `auto-renew-checkbox-1`, `-2` or `-3` — to the
   form block's **custom class** field.

One class per page. Each design is self-contained; combining classes is not
supported.

**To edit the copy** (the heading, description or opt-in label), create a new
custom question with your text and put that in the form block. The wording
lives in the question, not the page or the design.

> **Important:** this checkbox is not a replacement for the auto-renew
> checkbox used on donation pages. That checkbox has custom functionality
> linking it to additional transactional data that is saved when making a
> donation. Equivalent functionality could be added here later — but as a new
> scope enhancement.

Sizes switch on viewport width: hero ≥1201px, compact ≤1200px, mini ≤480px.
Animations honour the donor's reduced-motion setting.

### Page layouts

On centercenter2col, designs 1 and 2 break out to span the full column width;
that behaviour is scoped to that layout. The designs work fine on other page
layouts too (one-column, donation page layouts) — on those, the strips simply
stay with the form fields. Tested on "4Site Page Template - Center Center
1 Column" and all looks good there. Other pages should look acceptable but may
require small styling tweaks to be perfect.

## Custom properties

Every colour, image and bit of geometry is a CSS custom property declared on
the design's class. To customise a design, add its saved library code block to
the page — `Auto Renew Checkbox 1: Custom Styles`, `Auto Renew Checkbox 2:
Custom Styles` or `Auto Renew Checkbox 3: Custom Styles`. Each contains a
style tag with every property for that design (with `!important`, so the
values win regardless of load order).

**Unlink the code block from the component library before making any
changes.** While it is linked, edits apply to the shared component — and to
every page that uses it. Once unlinked, edit the values in place:

```html
<style>
  .auto-renew-checkbox-1 {
    --arc1_thanks-text: "Merci !" !important;
    --arc1_rule-color: #2e7d32 !important;
    /* ...every other property for the design, at its default */
  }
</style>
```

Set the properties on the design's class (as the code blocks do), not `:root`
— values set on `:root` never take effect.

One property is shared by all three designs:

| Property | What it does |
| -------- | ------------ |
| `--arc_inset` | Indents the strip from each side. `0px` (default) = designs 1 and 2 span the full column, design 3 aligns with the form fields |

The tables below list the defaults. Properties marked **per-size** are set to
different values at different screen sizes — overriding one applies your value
at every size.

---

## Design 1 — Filling strip with "Thanks!"

Icon and heading on the left, toggle on the right, a green rule along the
bottom. When ticked, the strip fills green, the copy turns white and a
"Thanks!" fades in under the toggle.

| Property | Default | What it controls |
| -------- | ------- | ---------------- |
| `--arc1_accent` | `#027932` | Toggle border and knob (unticked), focus ring |
| `--arc1_heading-color` | `#027932` | Heading text and icon, unticked |
| `--arc1_description-color` | `#1A1A1A` | Description copy |
| `--arc1_description-color_mobile` | `#525252` | Description copy at ≤480px |
| `--arc1_track-color` | `#CCE4D6` | Unticked toggle track |
| `--arc1_background-color` | `#ffffff` | Unticked strip background |
| `--arc1_rule-color` | `#4aa241` | Bottom rule **and** the ticked strip fill |
| `--arc1_icon` | rackcdn `auto-renew-icon.svg` | Heading icon; recoloured by mask, so any single-colour SVG works |
| `--arc1_thanks-text` | `"Thanks!"` | Confirmation under the toggle when ticked. A string — keep the quotes |

## Design 2 — Photo rail

Gray band with a green top rule. The checkbox is a large square that fills
black with a white tick. On the right, a rail of two photos pokes above the
band; ticking slides the ticked photo up, pushing the unticked one out.

The rail needs both photos stacked as backgrounds, so its width must stay a
length (px), never a percentage — the slide animation parks the photos one
rail-height apart.

| Property | Default | What it controls |
| -------- | ------- | ---------------- |
| `--arc2_accent` | `#00703c` | Top rule |
| `--arc2_heading-color` | `#027932` | Heading, checkbox border and tick, focus ring |
| `--arc2_background-color` | `#f8f8f8` | Band background |
| `--arc2_box_background-color_checked` | `#1a1a1a` | Ticked checkbox fill |
| `--arc2_image_unchecked` | rackcdn `auto-renew-image-unchecked.png` | Photo shown unticked |
| `--arc2_image_checked` | rackcdn `auto-renew-image-checked.png` | Photo shown ticked |
| `--arc2_tick-icon` | rackcdn `auto-renew-checkbox-tick.svg` | Tick inside the box |
| `--arc2_image-position_unchecked` | `center` | Horizontal crop focal point of each photo |
| `--arc2_image-position_checked` | `center` | ^ |
| `--arc2_rail-width` | `210px` | Rail width. **Per-size** (236px ≤480) |
| `--arc2_rail-height` | `width × 0.7` | Rail height. **Per-size** (134px ≤480) |
| `--arc2_rail-right` | `30px` | Gap between rail and strip edge. **Per-size** (15px ≤1200) |
| `--arc2_rail-breakout` | `26px` | How far the rail pokes above the band. **Per-size** (56px ≤480) |
| `--arc2_image-shadow` | soft drop shadow | Shadow under the photos |

## Design 3 — Inset row

A quiet row between hairline dividers: icon, heading and description on the
left, toggle on the right. The unticked knob is solid green; ticking turns the
track green and the knob white, with a sprout growing into it. The row is
capped at `--arc3_max-width` and stays aligned with the other form fields.

| Property | Default | What it controls |
| -------- | ------- | ---------------- |
| `--arc3_accent` | `#027932` | Track border, unticked knob, ticked track, ticked copy |
| `--arc3_track-color` | `#CCE4D6` | Unticked track |
| `--arc3_text-color` | `#00703C` | Heading, description and icon, unticked |
| `--arc3_divider-color` | `#CDCDCD` | Top and bottom hairlines |
| `--arc3_description-color_mobile` | `#525252` | Unticked description at ≤480px |
| `--arc3_knob-size` | `26px` | Knob diameter. **Per-size** (34px ≤480) |
| `--arc3_knob-inset` | `5px` | Knob's distance from the track edge. **Per-size** (6px ≤480) |
| `--arc3_icon` | rackcdn `auto-renew-icon.svg` | Row icon; recoloured by mask, like design 1 |
| `--arc3_max-width` | `401px` | Widest the row will grow |
| `--arc3_knob-icon` | inline sprout SVG | Icon drawn in the ticked knob. A 13×16 SVG data URI — find the current value in the design's Custom Styles code block and edit it there |

---

## Swapping images

Upload the image and override the matching property in the design's Custom
Styles code block. Crop to roughly the shape of the slot so nothing important
gets trimmed:

| Slot | Shape |
| ---- | ----- |
| Design 2, either photo | Landscape — about 10 : 7 |
| Design 1 / 3 icon | Square-ish SVG, single colour |

Design 2's photos are landscape but the rail crops them tall; nudge
`--arc2_image-position_unchecked` / `_checked` (`left`, `center`, `right` or a
percentage) until the subject sits in frame.

---

## Redirecting to a donation page with annual giving pre-selected

A natural pairing: the supporter ticks the auto-renew checkbox on your
petition page, and on submit they land on a donation page with annual giving
already selected and a banner reading **"Annual giving is pre-selected based
on your advocacy action"**.

Set it up with an **Advanced Redirect** on the petition page:

1. Set the **Fallback Redirect** to the donation page — e.g.
   `https://preserve.nature.org/page/199950/donate/1`.
2. Add a rule: **IF** a supporter submits the page with your auto-renew
   question `== Y`, **THEN** redirect to the same donation URL with the
   parameter `data-engrid-annual-giving=true` appended:

   ```
   https://preserve.nature.org/page/199950/donate/1?data-engrid-annual-giving=true
   ```

Supporters who ticked see the banner; everyone else takes the fallback and
gets the plain donation page. In the rule, the question appears as
`questions.XXXXXXX` — pick your auto-renew question from the list and EN fills
in its ID for you.

> **Important:** the banner parameter does not select the annual donation
> frequency for you — it only renders the banner. To pre-select annual, either
> configure the donation page to default to annual giving, or append
> `transaction.recurrfreq=ANNUAL` to the redirect URL as well:
>
> ```
> https://preserve.nature.org/page/199950/donate/1?data-engrid-annual-giving=true&transaction.recurrfreq=ANNUAL
> ```
>
> Either way, make sure the donation page is configured to accept annual
> donations in the first place.

---

## Testing

Each design has a demo page:

| Design | Demo page |
| ------ | --------- |
| 1 | https://preserve.nature.org/page/200334/petition/1 |
| 2 | https://preserve.nature.org/page/200333/petition/1 |
| 3 | https://preserve.nature.org/page/200363/petition/1 |

Each demo page includes its design's Custom Styles code block, still linked to
the component library — handy for seeing the defaults in action, and a reminder
of what a linked block affects before you unlink and edit your own.
