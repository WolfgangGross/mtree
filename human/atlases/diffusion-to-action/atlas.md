# From noise *to motion.*

kicker:         Field guide 02 / Visual intelligence
updated:        18 November 2026
accent:         green
hero:           arm-schematic
hero caption:   Arm schematic
hero stages:    Noise, Structure, Action
order:          1

How did a model that denoises images learn to move a robot arm? Trace the
breakthroughs in visual diffusion, video prediction and robot control.

[Explore the tech tree](#tree) · [Inside the control loop](#loop)

<!--
Everything below is the page, top to bottom. Each "## Section" is one band.
  kicker:  the small label above the title
  intro:   one line beside the title
  nav:     a short name for the page menu (leave out to hide it there)
  layout:  stacked (default), split (text left, figure right) or wide
Blocks:   ::tree   ::timeline   ::sources   :::bars … :::   :::control-loop … :::   :::callout … :::
Links:    [[milestone-id]] to a milestone, [@paper-id] or [@paper-id, p. 4] to a paper.
-->

## The technology tree
id:      tree
kicker:  Explore the research
nav:     Tech tree
intro:   Select a milestone to inspect its mechanism, connections and primary sources.

::tree

## Inside the control loop
id:      loop
kicker:  Robot control
nav:     Control loop
intro:   One tabletop task shows how predicted images become actions a motor can execute.

:::control-loop “Put the cube in the bowl.”
perturb:         Move the bowl
moved note:      The bowl moved. The current plan still ends at its old position.
replanned note:  The updated plan reaches the bowl’s new position.

**Observe** — Read the current scene
The camera locates the cube and bowl. Joint sensors tell the policy where the arm is.
The instruction supplies the goal. These are the conditions for the next prediction.

**Predict** — Sample a joint future
A world-action model predicts the gripper’s future views and a matching chunk of commands.
The dashed path shows one possible plan to pick up the cube and carry it to the observed bowl.

**Act** — Execute a short prefix
The gripper picks up the cube and follows the first part of the plan. While the robot is
executing this prefix, the remaining commands still refer to the earlier observation.

**Replan** — Look again before continuing
A fresh observation updates the gripper and bowl positions. The next chunk starts from where
the robot actually is and can correct the rest of the motion.
:::

### Four ways to choose the next move

| Approach | What the model predicts | Where the command comes from |
| --- | --- | --- |
| [[foresight]] | Future views for proposed actions | The planner picks the best candidate. |
| [[unipi]] | A video of a successful execution | An inverse model maps visual changes to actions. |
| [[diffusion-policy]] / [[pi0]] | A chunk of continuous commands | The policy samples a trajectory directly. |
| [[flux3-action]] | Future video and actions together | The joint model supplies the command chunk. |

## What does video pretraining buy?
id:      evidence
kicker:  Experimental evidence
layout:  split

In BFL’s controlled comparison, each initialization received 10,000 DROID fine-tuning steps.
Simulated task success rose with video-heavy pretraining and rose again when the model had
also seen actions.

These are preliminary RoboLab runs under a matched recipe. In a separate physical evaluation,
Positronic recorded 28 successes in 30 trials on a Franka arm across ten tasks. Each task had
three attempts.

Source: [@flux3-action, Figure 4] and [@flux3-action, Table 6].

:::bars RoboLab success after matched fine-tuning
max: 20%
Random initialization: 0.75%
Video-heavy pretraining: 12.4%
**Plus action midtraining**: 18.63%
:::

## Source index
id:      sources
kicker:  References
nav:     Sources
intro:   Original papers, project reports and model cards behind the tree. Dates follow the first public version where available.

::sources
