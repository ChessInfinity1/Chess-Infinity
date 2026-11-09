# Sidebar and profile redesign

The sidebar now keeps primary learning/play routes visible, groups exploration links separately, and places additional training modes in a native expandable section. Settings, public-profile connection, reminders and offline setup are reachable from the profile card. The learning count and training XP continue to use existing saved progress.

The footer profile entry is a 46px circular avatar button. A linked Chess.com profile uses its existing validated public avatar/name; accounts without an image use the existing fallback. The button opens an animated, nonmodal profile card within the drawer, with training level, XP, lesson progress, real navigation actions, and a link to the existing full chess profile when linked. No account authentication or synchronization behavior changes.

Motion includes the drawer slide, short row entrances, hover/press feedback, card opening/closing, and restrained page/profile entrances. All new motion is disabled by prefers-reduced-motion. Scrollable navigation and a bounded, independently scrollable profile card keep the footer reachable on narrow and short screens.

Keyboard checks caught and fixed nested Escape propagation: Escape first closes the profile card and restores the avatar focus, then closes mobile navigation on the next press. Hidden profile controls are inert and excluded from the drawer focus trap. Full chess-profile close has a visible focus fallback when entered from a drawer that has since closed.

Validation: TypeScript and whitespace checks; browser checks for mobile drawer/profile opening, profile shortcuts, expandable training navigation, Escape/focus restoration, outside-click dismissal, a 320px layout without horizontal overflow, desktop alignment, dark/light appearance, and a short 430px-high profile card with internal scrolling. The preview screenshot shows the local guest session rather than invented linked profile data. Temporary device-check HTML is removed before building.
