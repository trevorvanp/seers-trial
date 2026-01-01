// Seer’s Trial — Realms v1
// Structure: 3 prompts per realm → draw:3 → Gate reacts → next realm

-> start

=== start ===
# scene:intro
The candlelight doesn’t *flicker* — it *breathes*.
A voice you can’t quite locate speaks like it’s reading your pulse.

“Welcome, Traveler. The Gate remembers what you reveal.”

+ [Begin the Trial] -> traveler


// --------------------------------------------
// REALM 1 — TRAVELER
// --------------------------------------------
=== traveler ===
# realm:traveler
# realm_title:Seer’s Trial — Traveler
# realm_subtitle:Tarot. Runes. Choice. A gate that listens.

A deck rests on velvet. The Seer doesn’t shuffle — the cards seem to arrange themselves.

The Gate hums once, like it recognizes you.

The Seer leans closer.

The first card turns itself over.

The air tastes like rain.

The Seer’s voice drops to a whisper. # prompt:traveler_q1 # q:What kind of connection are you actually looking for right now?
(Your answer sinks into the velvet like a secret.)

A second card slides out like it’s late to the party. # prompt:traveler_q2 # q:What’s something people always misunderstand about you?
The candlelight sharpens.

A third card appears where your hand *almost* was. # prompt:traveler_q3 # q:What’s one thing you want someone to notice about you without you having to say it?
The Gate’s hum changes — subtle. Like it’s thinking.

The Seer deals three cards in a slow line. # draw:3
For a moment, the room feels heavier… like the cards pulled gravity out of you.

“The Gate heard you,” the Seer murmurs. “It approves… or it’s curious.”

+ [Step through the Gate] -> hearth


// --------------------------------------------
// REALM 2 — THE HEARTH
// --------------------------------------------
=== hearth ===
# realm:hearth
# realm_title:The Hearth
# realm_subtitle:Warmth, loyalty, the truth you live by.

You step into a chamber lit by a low ember glow.
Not cozy. Not threatening. Just… honest.

The Seer touches the deck once. The heat responds.

A card flips.

The Seer asks without judgment. # prompt:hearth_q1 # q:What does “loyalty” actually mean to you when things get hard?
The ember light steadies.

Another card lifts like it has its own lungs. # prompt:hearth_q2 # q:What kind of energy do you bring into someone’s life when you care about them?
The room listens.

A final card slides forward, edge-first. # prompt:hearth_q3 # q:What’s a boundary you’ve learned you *have* to keep, no matter who it is?
The ember glow flares once, then relaxes.

Three cards land in a triangle. # draw:3
The spread feels warm — but not soft.

The Gate speaks again, almost amused:
“Good. You have rules. That makes you interesting.”

+ [Walk onward] -> mirror


// --------------------------------------------
// REALM 3 — THE MIRROR
// --------------------------------------------
=== mirror ===
# realm:mirror
# realm_title:The Mirror
# realm_subtitle:Shadows, scars, what you’re becoming.

The corridor narrows into a polished black surface.
Not a mirror you look into — a mirror that looks into *you*.

The Seer’s voice becomes calmer. More precise.

A card appears face-down, like it’s being polite.

The Seer asks carefully. # prompt:mirror_q1 # q:What’s a lesson you learned the hard way that changed how you trust people?
The air is colder now.

A second card rotates, slow and deliberate. # prompt:mirror_q2 # q:When you shut down, what usually caused it?
The candlelight dims, then returns.

A third card taps the table once — impatient. # prompt:mirror_q3 # q:What’s a version of you that you’re trying to leave behind?
The mirror-surface ripples like it swallowed your answer.

Three cards slide into place. # draw:3
The spread feels like a confession written in ink.

The Gate’s voice comes through clean:
“You survive by pattern. That can be a shield… or a cage.”

+ [Keep going] -> wild


// --------------------------------------------
// REALM 4 — THE WILD
// --------------------------------------------
=== wild ===
# realm:wild
# realm_title:The Wild
# realm_subtitle:Desire, adventure, the spark you don’t tame.

The next room smells like thunder and pine.
You hear distant wind… or distant applause. Hard to tell.

The Seer smiles a little. Like this is the fun part.

A card flips like it’s flirting with the truth.

The Seer asks playfully. # prompt:wild_q1 # q:What kind of adventure would you secretly say yes to if the timing was perfect?
A laugh lives somewhere in the shadows.

Another card fans out, dramatic. # prompt:wild_q2 # q:What’s something you’re craving more of this year—emotionally or physically?
The air feels charged.

A third card lands with confidence. # prompt:wild_q3 # q:If someone wanted to win you over, what’s the one way they’d do it without trying too hard?
The room practically leans in.

Three cards flash into a spread. # draw:3
The Gate sounds… pleased.

“Now we’re talking,” it says. “That’s the scent of intention.”

+ [Follow the path] -> crown


// --------------------------------------------
// REALM 5 — THE CROWN (FINALE)
// --------------------------------------------
=== crown ===
# realm:crown
# realm_title:The Crown
# realm_subtitle:Clarity, choice, what happens next.

The final chamber is quiet and bright — not happy bright.
Truth bright.

The Seer sets the deck down like it’s finished pretending.

The Gate waits.

The Seer asks, and the question feels final.

# prompt:crown_q1
# q:What do you hope this connection becomes if it goes right?
The silence after your answer feels respectful.

# prompt:crown_q2
# q:What would make you walk away immediately—no debate?
The Gate seems to approve the bluntness.

# prompt:crown_q3
# q:What’s one thing you want to experience with someone this year that actually matters?
The air goes still.

The Seer deals the final spread. # draw:3
The cards settle like a verdict.

The Gate speaks softly now:
“I have what I need.”

+ [End the Trial] -> end


=== end ===
# scene:end
The candlelight exhales.
The Seer gathers the deck without looking at it — like the cards already chose.

“The Gate will remember.”

-> END
