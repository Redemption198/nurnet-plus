import gsap from "gsap";

// A notice that comes out from under the brand button (the floating pill on phones) and goes back
// under it when it's answered or closed: the language offer, whose text says the language can be
// changed later with that button's (i). Where the pill isn't on screen (desktop, or covered by the
// raised drawer) the toast keeps Nuxt UI's own slide. Visitors who ask for reduced motion get a
// fade.
// In two steps, as a drop out of the pill's bottom: a small square slides slowly out from under it,
// and once it's all in view it swells into the whole toast, with a bounce as it settles. The pill
// stays on top meanwhile, so the toast is seen leaving from beneath it

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// The compact BrandButton, if it's the topmost thing at its own centre, the toast aside (Nuxt UI's
// slide starts it over the pill)
function visiblePill(toast: HTMLElement): HTMLElement | null {
  const pill = document.querySelector<HTMLElement>("[data-brand-pill]");
  if (!pill) return null;
  const r = pill.getBoundingClientRect();
  if (!r.width) return null;
  const top = document
    .elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    .find((el) => !toast.contains(el));
  return top && pill.contains(top) ? pill : null;
}

// The toast's box mapped onto a square a little narrower than the pill, so it leaves through the
// bottom edge between the rounded corners (origin at the toast's top left): `under`, hidden behind
// the pill; `square`, out of it, at the toast's own top. Its corners as the pill's tile's (22.5%),
// each axis's radius undoing that axis's scale
function squares(box: DOMRect, pill: DOMRect) {
  const side = pill.width * 0.7;
  const x = pill.left + (pill.width - side) / 2 - box.left;
  const scaleX = side / box.width;
  const scaleY = side / box.height;
  const corner = side * 0.225;
  const borderRadius = `${corner / scaleX}px / ${corner / scaleY}px`;
  return {
    under: { x, y: pill.bottom - side - 2 - box.top, scaleX, scaleY, borderRadius },
    square: { x, y: 0, scaleX, scaleY, borderRadius },
  };
}

// The toast's own corners (rounded-2xl), in the same two-value form so GSAP can tween between them
const TOAST_RADIUS = "16px / 16px";

// The pill drawn again above the toaster while the toast goes under it: the app is a stacking
// context of its own (#__nuxt is isolated), which the toaster, in <body>, is always above, whatever
// the pill's z-index. The pill itself stays where it is, unseen but still tappable. Returns the
// copy; it's taken away (and the pill shown) by `uncover`
let uncover: (() => void) | undefined;
function coverPill(pill: HTMLElement) {
  uncover?.();
  const r = pill.getBoundingClientRect();
  const cover = pill.cloneNode(true) as HTMLElement;
  cover.removeAttribute("data-brand-pill");
  cover.setAttribute("aria-hidden", "true");
  cover.inert = true;
  Object.assign(cover.style, {
    position: "fixed",
    top: `${r.top}px`,
    left: `${r.left}px`,
    margin: "0",
    zIndex: "101",
    pointerEvents: "none",
    // Its CSS transition (press) would smooth GSAP's every frame
    transition: "none",
  });
  document.body.append(cover);
  // Without its transition, which would fade it back in as the copy goes: shown at once, read
  // back (so that's the style the transition starts from), then its transition again
  pill.style.transition = "none";
  pill.style.opacity = "0";
  uncover = () => {
    cover.remove();
    pill.style.opacity = "";
    void getComputedStyle(pill).opacity;
    pill.style.transition = "";
    uncover = undefined;
  };
  return cover;
}

// The pill's answer: it squeezes as the toast leaves it, swells a little as the toast comes back.
// Then the copy gives way to the pill
function nudge(cover: HTMLElement, from: number) {
  gsap.fromTo(
    cover,
    { scale: from },
    { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.45)", onComplete: () => uncover?.() },
  );
}

// The entrance, if it's still playing when the toast closes
let entrance: gsap.core.Timeline | undefined;

// Call as the toast is put in the page (a mutation observer), before it's painted
export function emergeFromPill(toast: HTMLElement) {
  const pill = visiblePill(toast);
  if (!pill) return;
  // Nuxt UI's slide in, off for good: put back, it would play again. Unseen until it starts
  toast.style.animation = "none";
  gsap.set(toast, { opacity: 0 });
  if (reduced()) {
    gsap.to(toast, { opacity: 1, duration: 0.2, ease: "power1.out", clearProps: "opacity" });
    return;
  }
  // Tucked under the pill on the next frame (still before it's painted): Nuxt UI measures the
  // toast's height as it mounts, which a scale now would shrink. Its transform transition (for
  // stacking) off while GSAP moves it
  requestAnimationFrame(() => {
    const { under, square } = squares(toast.getBoundingClientRect(), pill.getBoundingClientRect());
    const cover = coverPill(pill);
    gsap.set(toast, { transformOrigin: "0 0", transition: "none", opacity: 1, ...under });
    // The words once the shape is there, so they're never seen squashed
    gsap.set(toast.children, { opacity: 0 });
    entrance = gsap
      .timeline({
        onComplete: () => {
          gsap.set(toast, {
            clearProps: "transform,transformOrigin,transition,opacity,borderRadius",
          });
        },
      })
      .add(() => nudge(cover, 0.9), 0)
      // Slowly down out of the pill's bottom, until the square is all in view
      .to(toast, { y: square.y, duration: 0.55, ease: "power2.inOut" }, 0)
      // Then the whole toast. The width overshoots only a little (all of it goes right, towards
      // the screen's edge); the height bounces as it settles
      .to(toast, { x: 0, scaleX: 1, duration: 0.55, ease: "back.out(1.1)" }, 0.55)
      .to(toast, { borderRadius: TOAST_RADIUS, duration: 0.5, ease: "power2.out" }, 0.55)
      .to(toast, { scaleY: 1, duration: 0.8, ease: "elastic.out(1, 0.45)" }, 0.6)
      .to(
        toast.children,
        { opacity: 1, duration: 0.25, ease: "power1.out", clearProps: "opacity" },
        0.85,
      );
  });
}

// Call as the toast closes (its update:open). Nuxt UI takes it out of the page 200ms later, too
// soon for the trip back, so a copy of it makes the trip and the toast itself is hidden at once
export function returnToPill(toast: HTMLElement) {
  const pill = visiblePill(toast);
  if (!pill) return;
  entrance?.kill();
  gsap.set(toast, { clearProps: "transform,transformOrigin,opacity,borderRadius" });
  gsap.set(toast.children, { clearProps: "opacity" });
  const box = toast.getBoundingClientRect();

  const ghost = toast.cloneNode(true) as HTMLElement;
  for (const el of [ghost, ...ghost.querySelectorAll("[id]")]) el.removeAttribute("id");
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  // Where the toast is on screen, out of the toaster's stacking and swipe offsets
  Object.assign(ghost.style, {
    position: "fixed",
    top: `${box.top}px`,
    left: `${box.left}px`,
    right: "auto",
    width: `${box.width}px`,
    height: `${box.height}px`,
    margin: "0",
    zIndex: "100",
    animation: "none",
    transition: "none",
    translate: "none",
    pointerEvents: "none",
  });
  document.body.append(ghost);
  toast.style.setProperty("visibility", "hidden", "important");

  if (reduced()) {
    gsap.to(ghost, {
      opacity: 0,
      duration: 0.2,
      ease: "power1.in",
      onComplete: () => ghost.remove(),
    });
    return;
  }
  const { under, square } = squares(box, pill.getBoundingClientRect());
  const cover = coverPill(pill);
  gsap.set(ghost, { transformOrigin: "0 0", x: 0, y: 0, scale: 1, borderRadius: TOAST_RADIUS });
  // Faster than it came, the other way round: the words go, it shrinks to the square, then the
  // square is drawn up under the pill
  gsap
    .timeline({ onComplete: () => ghost.remove() })
    .to(ghost.children, { opacity: 0, duration: 0.1, ease: "none" }, 0)
    .to(ghost, { ...square, duration: 0.26, ease: "power2.in" }, 0)
    .to(ghost, { y: under.y, duration: 0.2, ease: "back.in(1.4)" }, 0.26)
    .add(() => nudge(cover, 1.08), 0.44);
}
