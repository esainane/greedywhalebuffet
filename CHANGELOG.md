# Changelog

## [v2.1, Unreleased]

### Simplifications

- The character selection process has been simplified. It now follows the "Evil Overload" template for all abnormal choices: Players must provide at least 2 normal picks for each character type.
- Yes, that means players may now ask for both Alchemist and Philosopher, as long as they also give the Storyteller enough normal Townsfolk to work with.
- The special soft restriction on choosing Atheist, Lil Monsta, and Legion has been removed.
- The special hard restriction on choosing Alchemist, Cult Leader, and Philosopher has been removed.
- Atheist and Summoner no longer need special classification as Demons, since they can no longer count towards the minimum number of normal picks for any character type.
- Most NPCs have been removed or merged.
- Removed the "Greedbuffet" NPC. Character selection rules have been moved to the Bootlegger NPC, which already contained most of those rules. The night order reminder to ask for mechanical bluffs is now handled by the "Dealer's Choice" NPC.
- Removed the "Jinxes" NPC. The Discord guild link is now provided through the script's Almanac link, which is clickable in the app. A short note has been added to the Bootlegger NPC to point people there.
- Removed the "Fussy" NPC. Storyteller bans are covered by a short line on the Bootlegger NPC.
- Removed the "Evil Overload" NPC. Providing extra picks for selections that make bag building difficult is now part of the standard selection process.
- Removed the "Ban Hammer" NPC. The "2 Votes" token has been moved to the "Dealer's Choice" NPC. Its ability text only reiterated standard Storyteller responsibilities.

### Character Updates

- Al-Hadikhia: Now a Greedy modified character. It may not choose another Demon.
- Flowergirl: Added reminder tokens.
- Heretic: Clarified Greedy's clause.
- Leviathan: No Death At Night (NDAN) jinx night choices made optional.
- Magician: Fixed blank first-night reminder.
- Mathematician: Changed reminder tokens from `Abnormalities` to `Abnormal` to match TPI's tokens.
- Riot: NDAN jinx night choices made optional. Added jinx selection reminder tokens.
- Soldier: Can now also be woken on the first night, if a Demon would have acted harmfully on the first night.
- Summoner: Consolidated failure modes from various jinxes into the ability, where they are told and given the option to reconsider if any part of a summoning, such as a Lord of Typhon minion being created, would fail.
- Vizier: Added a public reminder token.
- Yaggababble: Added missing first-night reminder. Added multiple kill reminder tokens.
- Night reminder texts have been heavily updated to match modern official versions, or follow modern templating.
- Made minor text fixes to many characters for templating consistency, and to keep them within the schema's character limits.

### Base Jinxes

- Overrode Leviathan's NDAN jinx with Ravenkeeper to add a missing "good".
- Created an optional "Use No Death At Night jinxes" ruleset for Leviathan, Riot, and Greedier's Armageddon with characters who depend on Demon attacks: Banshee, Exorcist, Farmer, Grandmother, Innkeeper, Monk, Ravenkeeper, Sage, Soldier, and the Greedier Journalist and Pathologist.
- When NDAN jinxes are disabled, those rarely-ran jinxes are omitted even when other jinx listings are enabled.
- Alchemist/Fearmonger: Removed. Now uses the default, no-jinx ability.
- Alchemist/Marionette: Reverted to standard TPI.
- Barber: Added missing jinxes Boffin/Pit-Hag style where Evil players could turn Good.
- Cannibal/Juggler: Reverted to standard TPI. The Cannibal now only learns a Juggler number if the Juggler was executed and killed before the night they would learn it.
- Cannibal/Princess: Reverted to standard TPI. It almost never comes up, and when it does, it's not worth the overhead to do it differently.
- Heretic: Reverted to standard TPI hate jinxes. Heretic/Baron has instead been removed entirely.
- Legion/{Hatter, Summoner}: Reverted to standard TPI. All currently Evil players become Legion if created midgame, and the Hatter has no ability if Legion is in play.
- Leviathan, Riot jinxes: Reverted to standard TPI, with a fixed version used for Leviathan/Ravenkeeper to add a missing "good".
- Magician/Vizier: Reverted to standard TPI. The Magicican loses their regular ability if the Vizier is in play.
- Riot/Atheist: Now requires a majority of players to vote for the ST, rather than the standard living count. No counternominations were possible on a Riot day, so Evil could get a very uninteractive victory when most players were dead.

### Homebrew Characters

- All Greedier character are available for inclusion, and have merged any post-season balance updates from Greediest.
- Manually reviewed and updated all Greedier character data, including ability text, setup metadata, reminder tokens, night reminders, and night order.
- Ancient One: Simplified to be a deluded character pair. They may now receive misinformation accordingly.
- Armageddon: Now uses Riot-level "This must happen." priority.
- Clergyman: Now +1 or +2 Clergymen at setup, avoiding a blank token at +0.
- Informant: Can now learn players who woke up for any reason, matching the original character design.
- Jester: Clarify Goblin-style nomination condition.
- Reflector: Added icons. Reflection is now optional. The character takes an Outsider slot, and should not be a super-Mayor that continues to live even if mechanically confirmed.
- Shepherd: Added icons.

### Homebrew Jinxes

- Added Greedier-specific jinx data.
- Redundant or official-equivalent jinxes have been removed.
- Manually reviewed and updated all Greedier jinx data.

### Optional quirks

- Added an option to permit duplicate characters during setup. This adds a note to the Bootlegger.
- Added an option to include the Spirit of Ivory.
- Added an option for "Alejo rules" first-night ordering. The Snake Charmer then acts before Minion and Demon info.

### Night Cards

- Added signal card: Ask Minions and Demons what they are mechanically bluffing as.
- Added signal card: Ask players for more character choices, if they have not provided enough normal picks.

### Night Order

- Night order is now consistent with the standard night order. There are too many to list, but this includes Snitch going immediately after Minion info; Princess immediately before Demon actions; Lunatic before Demon actions but now after potential poisoning, and so on.
- Riot and Leviathan now use their upstream TPI night order, reminders, and reminder tokens by default. When No Death At Night jinxes are enabled, they instead receive the Greedy jinx-selection night position after other Demons. Greedier's Armageddon uses the same jinx-selection position when included.
- Soldier still acts immediately before Chambermaid. They may also now receive a notification on the first night if they were protected from a Pukka, Lleech, certain Minions holding Lil Monsta, or other exceptional cases.
- Hermit still has a reminder before player characters, but acts after Duchess or Toymaker, if the Storyteller really wishes to run GWB with these NPCs.

### Fixes & Cleanup

- The JSON is now fully schema compliant! The app can finally load GWB without showing a dialog full of errors!
- Removed `_meta` night-order arrays from the JSON. Listing more than 30 characters is a schema error, so these arrays could not be used for GWB without causing errors.
- Night order now follows character-defined night order priority. Every character has had their night order priority manually reviewed and corrected.
- Character names and ability text have been rewritten to stay within the 30/250 character limits.
- Removed invalid references to the removed Shushing Stick and custom Cacklejack.
- The script file is now formatted consistently.
- Replaced third-party image URLs for base characters with optimized self-hosted icons.

---

## [v2.0] Upstream Release

Upstream release of Greedy Whalebuffet+ v2.0.
