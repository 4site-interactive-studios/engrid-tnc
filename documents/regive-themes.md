# Regive Themes

Three themes for the Regive one-click upsell. All styling lives in
`src/sass/components/regive.scss` — a page only needs the two saved library
components listed below.

| Theme | Looks like | Sits |
| ----- | ---------- | ---- |
| `tnc-regive-1` | Header bar, wide photo, ask and CTA side by side | In the thank-you copy |
| `tnc-regive-2` | Two columns — copy left, tall photo right | In the thank-you copy |
| `tnc-regive-3` | Lightbox over a dimmed page, with a close button | Overlays the page |

## Setting up a page

Every theme needs two pieces:

1. **A `<template>` on Page 1** — the donation form. This holds the theme's
   markup. It renders nothing to donors; Regive reads it when it builds the
   banner.
2. **A `<regive>` tag on the Thank You page**, wrapped in a `<div>`. The wrapper
   is required — see each theme below for which one.

Both go in code blocks. The Page 1 template can sit anywhere on the page.

### Use the saved library components

Both pieces are saved in the EN component library, so there is no need to paste
the HTML by hand. Add a code block and insert the matching component:

| Design | Page 1 (donation form) | Page 2 (Thank You) |
| ------ | ---------------------- | ------------------ |
| 1 | `Regive: Design 1 - Page 1` | `Regive: Design 1 - Page 2` |
| 2 | `Regive: Design 2 - Page 1` | `Regive: Design 2 - Page 2` |
| 3 | `Regive: Design 3 - Page 1` | `Regive: Design 3 - Page 2` |

Use the pair from the same design — a Page 1 template only works with the
Page 2 tag that names its theme.

The HTML for each is reproduced below, for reference and for when the copy or
the tag options need changing.

### Editing the copy

Edit the text directly in the Page 1 template. Two placeholders get filled in
automatically:

| Placeholder | Becomes |
| ----------- | ------- |
| `{{ask-amount}}` | The ask, formatted as currency — e.g. `$60` |
| `{{button}}` | The donate button |

**`{{button}}` must stay in the template.** Without it the theme is ignored and
Regive falls back to its default look.

### Tag options

| Option | What it does |
| ------ | ------------ |
| `theme` | Which theme to use — `tnc-regive-1`, `-2` or `-3` |
| `amount` | The ask. A number (`60`), or a percentage of the original gift (`120%`) |
| `frequency` | How the new gift recurs — `annual`, `monthly`, `quarterly`, `onetime` |
| `hide-for-frequency` | Skip the ask for donors who already gave at this frequency |
| `button-label` | Button text. `{{amount}}` inserts the ask |
| `bg-color` | Background behind the banner while it loads |
| `thank-you-message` | Shown after the donor accepts |

---

## Design 1 — Annual upsell card

### Page 1

Library component: `Regive: Design 1 - Page 1`

```html
<template id="tnc-regive-1">
  <div class="tnc-regive-1">
    <div class="tnc-regive-1__header">
      <h2 class="tnc-regive-1__title">Make your gift work year after year</h2>
    </div>

    <figure class="tnc-regive-media">
      <img
        class="tnc-regive-1__image"
        src="https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2246/design-1-hero-cropped.jpg?v=1790080068000"
        alt=""
      />
      <button
        type="button"
        class="tnc-regive-attribution"
        aria-label="Show photo credit"
      >
        i
      </button>
      <figcaption class="tnc-regive-credit">
        Canada lynx, Okanogan-Wenatchee National Forest. &copy; Photo Credit
      </figcaption>
    </figure>

    <div class="tnc-regive-1__body">
      <div class="tnc-regive-1__copy">
        <p class="tnc-regive-1__ask">{{ask-amount}} a year protects 3 acres.</p>
        <p class="tnc-regive-1__lede">
          Your gift is already making a difference. Adding an annual membership
          ensures that protection continues.
        </p>
      </div>

      <div class="regive-captcha-container"></div>

      <div class="tnc-regive-1__actions">
        <div class="tnc-regive-1__cta">
          {{button}}
          <p class="tnc-regive-1__note">Suggested based on your gift amount</p>
        </div>
        <p class="tnc-regive-1__assurance">Uses your saved payment info</p>
      </div>
    </div>
  </div>
</template>
```

### Thank You page

Library component: `Regive: Design 1 - Page 2`

Wrap the tag in `tnc-regive-inline`. This moves the ask into the thank-you copy,
above the rule before "Explore Nature.org".

```html
<div class="tnc-regive-inline">
  <regive
    theme="tnc-regive-1"
    amount="60"
    frequency="annual"
    hide-for-frequency="annual"
    button-label="Give {{amount}} Annually"
    bg-color="#e6f1ec"
    thank-you-message="Thank you for becoming a member!"
  ></regive>
</div>
```

---

## Design 2 — Two-column upsell

### Page 1

Library component: `Regive: Design 2 - Page 1`

```html
<template id="tnc-regive-2">
  <div class="tnc-regive-2">
    <figure class="tnc-regive-media tnc-regive-2__media">
      <img
        class="tnc-regive-2__image"
        src="https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2246/design-2-hero.jpg?v=1790085063000"
        alt=""
      />
      <button
        type="button"
        class="tnc-regive-attribution"
        aria-label="Show photo credit"
      >
        i
      </button>
      <figcaption class="tnc-regive-credit">
        Canada lynx, Okanogan-Wenatchee National Forest. &copy; Photo Credit
      </figcaption>
    </figure>

    <div class="tnc-regive-2__body">
      <div class="tnc-regive-2__copy">
        <div class="tnc-regive-2__intro">
          <p class="tnc-regive-2__note">Suggested based on your gift amount</p>
          <h2 class="tnc-regive-2__title">Make your gift work year after year</h2>
        </div>
        <div class="tnc-regive-2__message">
          <p class="tnc-regive-2__ask">{{ask-amount}} a year protects 3 acres.</p>
          <p class="tnc-regive-2__lede">
            Your gift is already making a difference. Adding an annual membership
            ensures that protection continues.
          </p>
        </div>
      </div>

      <div class="regive-captcha-container"></div>

      <div class="tnc-regive-2__actions">
        {{button}}
        <p class="tnc-regive-2__assurance">Uses your saved payment info</p>
      </div>
    </div>
  </div>
</template>
```

### Thank You page

Library component: `Regive: Design 2 - Page 2`

Same wrapper as design 1.

```html
<div class="tnc-regive-inline">
  <regive
    theme="tnc-regive-2"
    amount="60"
    frequency="annual"
    hide-for-frequency="annual"
    button-label="Give {{amount}} Annually"
    bg-color="#e6f1ec"
    thank-you-message="Thank you for becoming a member!"
  ></regive>
</div>
```

---

## Design 3 — Lightbox

Overlays the page on a dimmed backdrop. The close button, the "No thanks" link
and the Escape key all dismiss it.

Once a donor accepts the ask, the thank-you message shows for six seconds and
then the lightbox closes itself, revealing the receipt underneath. That is
handled for you — Regive hides its own close button at that point, so without it
the overlay would stay up with no way out.

### Page 1

Library component: `Regive: Design 3 - Page 1`

```html
<template id="tnc-regive-3">
  <div class="tnc-regive-3">
    <div class="tnc-regive-3__header">
      <img
        class="tnc-regive-3__badge"
        src="https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2246/Lands_Green+1.svg?v=1790088369000"
        alt=""
      />
      <h2 class="tnc-regive-3__title">Make your gift work year after year</h2>
      <button type="button" class="tnc-regive-3__close">Close</button>
    </div>

    <figure class="tnc-regive-media">
      <img
        class="tnc-regive-3__image"
        src="https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2246/design-1-hero-cropped.jpg?v=1790080068000"
        alt=""
      />
      <button
        type="button"
        class="tnc-regive-attribution"
        aria-label="Show photo credit"
      >
        i
      </button>
      <figcaption class="tnc-regive-credit">
        Canada lynx, Okanogan-Wenatchee National Forest. &copy; Photo Credit
      </figcaption>
    </figure>

    <div class="tnc-regive-3__body">
      <div class="tnc-regive-3__split">
        <div class="tnc-regive-3__copy">
          <p class="tnc-regive-3__ask">{{ask-amount}} a year protects 3 acres.</p>
          <p class="tnc-regive-3__lede">
            Your gift is already making a difference. Adding an annual membership
            ensures that protection continues.
          </p>
        </div>

        <div class="tnc-regive-3__rule" aria-hidden="true"></div>

        <div class="tnc-regive-3__actions">
          {{button}}
          <button type="button" class="tnc-regive-3__decline">
            No thanks, my one-time gift is enough
          </button>
        </div>
      </div>

      <div class="regive-captcha-container"></div>

      <p class="tnc-regive-3__assurance">Uses your saved supporter info</p>
    </div>
  </div>
</template>
```

### Thank You page

Library component: `Regive: Design 3 - Page 2`

Wrap the tag in `tnc-regive-lightbox`. This one is **not** interchangeable with
`tnc-regive-inline` — it is what makes the banner overlay the page.

```html
<div class="tnc-regive-lightbox">
  <regive
    theme="tnc-regive-3"
    amount="60"
    frequency="annual"
    button-label="Give {{amount}} Annually"
    bg-color="#eae8f5"
    thank-you-message="Thank you for becoming a member!"
  ></regive>
</div>
```

---

## Swapping the photo

Upload the image, then replace the `src` on the theme's `<img>`. Crop it to
roughly the shape of the slot so nothing important gets trimmed:

| Theme | Shape |
| ----- | ----- |
| Design 1 | Wide — about 2.3 : 1 |
| Design 2 | Upright — about 0.9 : 1 |
| Design 3 | Wide — about 2.8 : 1 |

The credit in `<figcaption>` appears when the donor clicks the "i".

## Testing

The banner only appears after a real donation, because it reuses the card
details from that gift. To see it without donating, add `test="true"` to the
tag, or load the Thank You page with test parameters:

```
/page/<id>/donate/2?regive-test=true&regive-test-method=card
```

Two things to know when testing:

**Designs 1 and 2 hide themselves for donors who already gave annually.** If the
ask doesn't appear, check whether the page thinks the gift was annual. The
frequency is remembered per browser session, so testing an annual gift earlier
will carry over. Reset it from the browser console and reload:

```js
sessionStorage.setItem('engrid-transaction-recurring-frequency', 'onetime')
```

**In test mode the banner comes back after you accept it.** That is deliberate,
so you can test repeatedly. On a live page it appears once.
