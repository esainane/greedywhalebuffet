# Changelog

## [Unreleased]

### Simplifications
- The character selection process has been simplified. It now follows the "Evil Overload" template for all abnormal choices: Players provide at least 2 normal picks per character type.
- Yes, that means players can now ask for both Alchemist and Philosopher, as long as they also give the Storyteller enough regular Townsfolk to work with.
- There is no longer a special soft restriction on choosing Atheist, Lil Monsta, and Legion.
- There is no longer a special hard restriction on choosing Alchemist, Cult Leader, and Philosopher.
- There are no longer special classifications for the very unusual Atheist and Summoner as Demons, since they can no longer count towards the minimum normal picks for any character type.
- Most NPCs have been removed or merged.
- Removed the "Greedbuffet" NPC. The selection process is now moved to the "Bootlegger" NPC, which already listed most of the rules around character selection, and is now in one place. The night order reminder to ask for mechanical bluffs is now fulfilled by the "Dealer's Choice" NPC.
- Removed the "Jinxes" NPC. The link to the Discord guild is now provided as the script's Almanac link, which is actually clickable in the app. A short line is added to the Bootlegger NPC to point people towards this.
- Removed the "Fussy" NPC. The ST making bans is now a short line on the Bootlegger NPC.
- Removed the "Evil Overload" NPC. Providing more picks when choosing selections that make bag building difficult is now part of the standard selection process.
- Removed the "Ban Hammer" NPC. The "2 Votes" token has been moved to the "Dealer's Choice" NPC. The "Ability" reiterated standard Storyteller responsibilities.

### Character Updates
- Flowergirl: Added reminder tokens.
- Magician: Fixed blank first-night reminder.
- Soldier: Can now also be woken on the first night, if a Demon would have acted harmfully on the first night.
- Vizier: Now has a public reminder token.
- Yaggababble: Added missing first-night reminder.
- Minor fixes to many characters' text for templating consistency, and to stay within the schema's character limits.

### Night Cards
- Added signal card: Ask Minions and Demons what they are mechanically bluffing as.
- Added signal card: Ask players to choose more characters, if they have not provided enough normal picks.

### Night Order
- Night order is now consistent with the standard night order. There are too many to list, but this includes Snitch going immediately after Minion info; Princess immediately before Demon actions; Lunatic before Demon actions but now after potential poisoning, and so on.
- Riot and Leviathan explicitly retain their GWB night order instead of the standard night order: acting after other Demons to perform selections for related jinxes, instead of at end of night to update day reminders.
- Soldier continues to act immediately before Chambermaid. They may also now receive a notification on the first night if they were protected from a Pukka, Lleech, or certain Minions holding Lil Monsta.
- Hermit continues to have a reminder before player characters, but acts after Duchess or Toymaker, if a Storyteller really wishes to run GWB with these NPCs.

### Fixes & Cleanup
- The JSON is now fully schema compliant! The app can finally load GWB without showing a dialog listing all of the errors!
- Removed `_meta` night-order arrays from the JSON. More than 30 characters listed was treated as a schema error, so it is not possible to use for GWB without errors.
- Night order now follows character-defined night order priority. Every character has had their night order priority manually reviewed and corrected.
- Character names and ability text have been rewritten to be below the 30/250 character limits.
- Removed invalid references to the removed Shushing Stick and custom Cacklejack.
- The script file is now formatted consistently.

---

## [v2.0] Upstream Release

Upstream release of Greedy Whalebuffet+ v2.0.
