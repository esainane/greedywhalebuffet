# Changelog

## [v2.1, Unreleased]

### Simplifications
- The character selection process has been simplified. It now follows the "Evil Overload" template for all abnormal choices: Players must provide at least 2 normal picks for each character type.
- Yes, that means players may now ask for both Alchemist and Philosopher, as long as they also give the Storyteller enough normal Townsfolk to work with.
- There special soft restriction on choosing Atheist, Lil Monsta, and Legion has been removed.
- There special hard restriction on choosing Alchemist, Cult Leader, and Philosopher has been removed.
- Atheist and Summoner no longer need special classification as Demons, since they can no longer count towards the minimum number of normal picks for any character type.
- Most NPCs have been removed or merged.
- Removed the "Greedbuffet" NPC. Character selection rules have been moved to the Bootlegger NPC, which already contained most of those rules. The night order reminder to ask for mechanical bluffs is now handled by the "Dealer's Choice" NPC.
- Removed the "Jinxes" NPC. The Discord guild link is now provided through the script's Almanac link, which is clickable in the app. A short note has been added to the Bootlegger NPC to point people there.
- Removed the "Fussy" NPC. Storyteller bans are covered by a short line on the Bootlegger NPC.
- Removed the "Evil Overload" NPC. Providing extra picks for selections that make bag building difficult is now part of the standard selection process.
- Removed the "Ban Hammer" NPC. The "2 Votes" token has been moved to the "Dealer's Choice" NPC. Its ability text only reiterated standard Storyteller responsibilities.

### Character Updates
- Flowergirl: Added reminder tokens.
- Magician: Fixed blank first-night reminder.
- Riot: Added jinx selection reminder tokens.
- Soldier: Can now also be woken on the first night, if a Demon would have acted harmfully on the first night.
- Vizier: Added a public reminder token.
- Yaggababble: Added missing first-night reminder. Added multiple kill reminder tokens.
- Night reminder texts have been heavily updated to match modern official versions, or follow modern templating.
- Made minor text fixes to many characters for templating consistency, and to keep them within the schema's character limits.

### Night Cards
- Added signal card: Ask Minions and Demons what they are mechanically bluffing as.
- Added signal card: Ask players for more character choices, if they have not provided enough normal picks.

### Night Order
- Night order is now consistent with the standard night order. There are too many to list, but this includes Snitch going immediately after Minion info; Princess immediately before Demon actions; Lunatic before Demon actions but now after potential poisoning, and so on.
- Riot and Leviathan explicitly keep their GWB night order instead of the standard night order. They act after other Demons to make selections for related jinxes, rather than acting at the end of the night to update day reminders.
- Soldier still acts immediately before Chambermaid. They may also now receive a notification on the first night if they were protected from a Pukka, Lleech, certain Minions holding Lil Monsta, or other exceptional cases.
- Hermit still has a reminder before player characters, but acts after Duchess or Toymaker, if the Storyteller really wishes to run GWB with these NPCs.

### Fixes & Cleanup
- The JSON is now fully schema compliant! The app can finally load GWB without showing a dialog full of errors!
- Removed `_meta` night-order arrays from the JSON. Listing more than 30 characters is a schema error, so these arrays could not be used for GWB without causing errors.
- Night order now follows character-defined night order priority. Every character has had their night order priority manually reviewed and corrected.
- Character names and ability text have been rewritten to stay within the 30/250 character limits.
- Removed invalid references to the removed Shushing Stick and custom Cacklejack.
- The script file is now formatted consistently.

---

## [v2.0] Upstream Release

Upstream release of Greedy Whalebuffet+ v2.0.
