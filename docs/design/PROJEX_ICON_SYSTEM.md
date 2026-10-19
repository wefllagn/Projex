# Projex Icon Kit v1

Original geometric artwork authored for this pass; no copied GitHub assets or
third-party icon framework. Friendly rounded strokes in Projex blue, consistent
24x24 viewBox, 1.7-unit stroke, round caps/joins and approximately 2–3-unit padding.

## Inventory and formats

Directory: client/src/assets/icons/projex/.

| Asset name | Meaning |
| --- | --- |
| class | Academic class/offering |
| assignment | Assigned programming work |
| group-project | Group project/task |
| repository | Git repository |
| folder | Directory |
| file | General text file |
| java-source | Java source, not official Java branding |
| branch | Git branch |
| commit | Git commit |
| members | Group membership |
| invitation | Membership invitation |
| code | Source/native Git access |
| run | Execute code |
| tests | Test execution/results |
| submission | Official submission/upload direction |
| review | Academic review |
| feedback | Released guidance/comments |
| activity | Recorded operations |
| admin | Administrative scope |
| archive | Preserve read-only |
| restore | Restore a preserved record |

Each name has an SVG master and transparent PNG exports named name-24.png,
name-48.png, name-96.png. Actual output: 21 SVG masters and 63 PNG icons.
contact-sheet.svg/png show the inventory on a white presentation background;
the individual assets have no background rectangle.

## Usage

ProjexIcon in client/src/design/ProjexIcon.jsx imports known original SVGs.
Use 16px inline, 20px controls/list markers, 24px standalone and 28–32px pane
identity. Prefer SVG in UI; PNG 48/96 are 2x/4x for 24px display or document use.
Never stretch to a non-square aspect ratio; do not add arbitrary per-screen
stroke widths, emoji, shadows or a different icon family at the same hierarchy.

Example JSX: <ProjexIcon name="repository" size={24} /> Repository

Decorative beside a text label: omit label; component emits empty alt and
aria-hidden. Standalone meaningful image: supply label="Repository". Interactive
icon must live in a real button/link with a specific accessible name and state;
an icon is not itself an action. Keep visible text for essential actions.

Recommended artwork color #0961ed on light surfaces, measured 5.32:1 on white.
Use semantic status chips/diff tokens for success/warning/destruction instead
of recoloring raster files arbitrarily. Do not use this v1 fixed-blue image
on a blue button without sufficient contrast; text remains the essential cue.

Representative adoption: Project task/repository/group headings, repository
header and desktop tabs, folder/file/Java rows, commit/date markers, branches,
Invite Member and recorded Git event markers. Activity/Admin icons are inventory
only; those unrelated screens were not redesigned.

## Reproducible exports and validation

client/scripts/export-projex-icons.mjs reads SVG masters and uses an existing
Sharp module. Resolve Sharp normally or set PROJEX_SHARP_MODULE to its already
installed absolute module directory. Run node scripts/export-projex-icons.mjs
from client/. No dependency install or package change is needed in this workspace.

Exports use fixed sizes, PNG compression 9 and no adaptive filtering. Script
checks dimensions, alpha channel, actual transparent pixels and nonempty artwork.
The contact sheet was visually inspected. Keep generated PNGs beside masters;
update all three sizes whenever editing a master. Do not claim exports exist
until generation and inspection complete. The exporter path is tooling, not
a browser runtime dependency. Current runtime uses SVG only.
