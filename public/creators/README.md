# Creator portraits

The orbit on `/app/rewards` looks for a portrait here for each creator in
`components/app/rewards/CreatorOrbit.tsx`, named by slug:

    iman-gadzhi.jpg
    andrew-tate.jpg
    alex-hormozi.jpg
    grant-cardone.jpg
    luke-belmar.jpg

No code change is needed — the paths derive from the names. Anything missing
falls back to a monogram, so a partial set is fine. A file that doesn't fit the
convention can be pointed at directly with `src` on that creator instead.

**What works:** square, face centred and cropped tight. They render inside a
circle up to ~96px wide, so a wide shot or a busy background turns to mush at
that size. 256×256 is plenty; larger is wasted since `next/image` resizes down
anyway. `.jpg` is the convention — `.png` or `.webp` need the extension changed
in `portraitFor`.
