import gsap from "gsap";

// A notice that comes out of the brand button (the floating pill on phones) and goes back into it
// when it's answered or closed: the language offer, whose text says the language can be changed
// later with that button's (i). Where the pill isn't on screen (desktop, or covered by the raised
// drawer) the toast keeps Nuxt UI's own slide. Visitors who ask for reduced motion get a fade.
// A little elastic, as a drop squeezed out of the pill: the width leads and the height follows a
// beat later, so it lands wide and thin, then fills out

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

// The toast's box mapped onto the pill's (origin at the toast's top left), a little inside it so
// it buds from behind the logo rather than covering it
function onPill(box: DOMRect, pill: DOMRect) {
  const shrink = 0.7;
  return {
    x: pill.left + (pill.width * (1 - shrink)) / 2 - box.left,
    y: pill.top + (pill.height * (1 - shrink)) / 2 - box.top,
    scaleX: (pill.width * shrink) / box.width,
    scaleY: (pill.height * shrink) / box.height,
  };
}

// The pill's answer: it squeezes as the toast leaves it, swells a little as the toast comes back.
// Its CSS transition (press) would smooth GSAP's every frame, so it's off meanwhile
function nudge(pill: HTMLElement, from: number) {
  gsap.set(pill, { transition: "none" });
  gsap.fromTo(
    pill,
    { scale: from },
    {
      scale: 1,
      duration: 0.6,
      ease: "elastic.out(1, 0.45)",
      overwrite: true,
      clearProps: "scale,transform,transition",
    },
  );
}

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
  // Squeezed onto the pill on the next frame (still before it's painted): Nuxt UI measures the
  // toast's height as it mounts, which a scale now would shrink. Its transform transition (for
  // stacking) off while GSAP moves it
  requestAnimationFrame(() => {
    const start = onPill(toast.getBoundingClientRect(), pill.getBoundingClientRect());
    gsap.set(toast, { transformOrigin: "0 0", transition: "none", ...start });
    gsap
      .timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          gsap.set(toast, { clearProps: "transform,transformOrigin,transition,opacity" });
        },
      })
      .add(() => nudge(pill, 0.86), 0)
      .to(toast, { opacity: 1, duration: 0.12, ease: "none" }, 0)
      .to(toast, { x: 0, y: 0, duration: 0.5, ease: "back.out(1.4)" }, 0)
      // A slight overshoot only: all of it goes right, towards the screen's edge
      .to(toast, { scaleX: 1, duration: 0.5, ease: "back.out(1.15)" }, 0)
      .to(toast, { scaleY: 1, duration: 0.75, ease: "elastic.out(1, 0.6)" }, 0.06)
      // The words once the shape is there, so they're never seen squashed
      .fromTo(
        toast.children,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: "power1.out", clearProps: "opacity" },
        0.22,
      );
  });
}

// Call as the toast closes (its update:open). Nuxt UI takes it out of the page 200ms later, too
// soon for the trip back, so a copy of it makes the trip and the toast itself is hidden at once
export function returnToPill(toast: HTMLElement) {
  const pill = visiblePill(toast);
  if (!pill) return;
  gsap.killTweensOf([toast, toast.children]);
  gsap.set(toast, { clearProps: "transform,transformOrigin,opacity" });
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

  const done = () => ghost.remove();
  if (reduced()) {
    gsap.to(ghost, { opacity: 0, duration: 0.2, ease: "power1.in", onComplete: done });
    return;
  }
  const end = onPill(box, pill.getBoundingClientRect());
  gsap.set(ghost, { transformOrigin: "0 0", x: 0, y: 0, scale: 1 });
  // Faster than it came: the words go first, the height gives way, then the width is drawn in
  gsap
    .timeline({ onComplete: done })
    .to(ghost.children, { opacity: 0, duration: 0.1, ease: "none" }, 0)
    .to(ghost, { scaleY: end.scaleY, duration: 0.26, ease: "power2.in" }, 0.02)
    .to(ghost, { scaleX: end.scaleX, x: end.x, y: end.y, duration: 0.34, ease: "back.in(1.2)" }, 0)
    .to(ghost, { opacity: 0, duration: 0.08, ease: "none" }, 0.28)
    .add(() => nudge(pill, 1.08), 0.3);
}
