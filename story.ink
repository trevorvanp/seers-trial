VAR playerName = "Traveler"
VAR runes = 0
VAR favor = 0

=== start ===
# SCREEN:TITLE
~ temp t = ""
The Runebound Gate hums in the dark.
A tarot thread became a door.

+ Begin the Trial
    -> nameEntry

=== nameEntry ===
# SCREEN:NAME
What name does the Gate carve into the stone?
+ Traveler
    ~ playerName = "Traveler"
    -> prologue
+ Seer (default)
    ~ playerName = "Seer"
    -> prologue
+ I choose my own name…
    -> customName

=== customName ===
# INPUT:NAME
Type your name in the box below, then continue.
-> prologue

=== prologue ===
# SCREEN:PROLOGUE
{playerName}, a voice like candle-smoke whispers:

"Not secrets. Choices. And choices reveal everything."

+ Step to the Realm Map
    -> realmHub

=== realmHub ===
# SCREEN:MAP
Runes claimed: {runes}/9  •  Favor: {favor}

Choose a realm:

+ Asgard (Ideals, honor, leadership)
    -> asgard
+ Midgard (Coming next)
    -> stub("Midgard")
+ Vanaheim (Coming next)
    -> stub("Vanaheim")

=== asgard ===
# REALM:ASGARD
# TAROT:DRAW
Bifrost hums beneath your feet.
Heimdall blocks your path.

"Speak. Why should Asgard open?"

+ “I protect the people I love — even when it costs me.”
    ~ favor += 1
    ~ runes += 1
    -> asgardReward("Tiwaz", "Courage with a code.")
+ “I lead from the shadows. Quiet power.”
    ~ runes += 1
    -> asgardReward("Eihwaz", "Quiet strength. Private power.")
+ “I take the throne — to destroy what corrupts it.”
    ~ favor += 1
    ~ runes += 1
    -> asgardReward("Sowilo", "Fire that tells the truth.")

=== asgardReward(runeName, runeDesc) ===
# SCREEN:REWARD
Rune claimed: {runeName}
{runeDesc}

+ Return to Realm Map
    -> realmHub

=== stub(realmName) ===
# SCREEN:STUB
{realmName} is being forged next. The Gate hums… impatient.

+ Back
    -> realmHub

