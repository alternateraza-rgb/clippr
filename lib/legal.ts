/**
 * Details every policy page repeats. Kept in one place because a payment
 * processor checks that they agree with each other, and because these are the
 * three things that must be correct before the pages are submitted anywhere.
 */

/** The address you actually monitor. Verification will email it. */
export const LEGAL_CONTACT = "support@clipmuse.com";

/** The entity that takes the money. */
export const LEGAL_ENTITY = "Clipmuse";

/** Whose law governs the terms, and where disputes are heard. */
export const LEGAL_JURISDICTION = "England and Wales";

export const LEGAL_UPDATED = "24 August 2026";
