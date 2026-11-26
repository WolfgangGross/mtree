# Branches

<!--
Each branch is one tab of the tree. The indented block is the layout:
one row per line, milestone ids in columns, "·" for an empty cell.
Arrows are drawn for every connection between milestones on the same branch.
-->

## Diffusion foundations
short:      Foundations
icon:       layers
summary:    Noise, conditioning and transport
starts at:  ddpm

    thermo   ·     flow-matching
    ddpm     ·     ·
    ddim     ldm   cfg
    ·        dit   ·
    ·        sd3   ·

## Image & video
short:      Image & video
icon:       film
summary:    From spatial latents to moving scenes
starts at:  video-diffusion

    ldm             video-diffusion   dit
    svd             ·                 sora
    ·               sd3               ·
    flow-matching   flux1             ·
    ·               flux3             ·

## Robotics & action
short:      Robotics & action
icon:       robot
summary:    From visual foresight to robot policies
starts at:  diffusion-policy

    foresight   ddpm               rt2
    unipi       diffuser           ·
    gr1         diffusion-policy   pi0
    dreamzero   ·                  droid
    ·           flux3-action       ·

## The FLUX 3 family
short:      FLUX 3 family
icon:       fork
summary:    One backbone, distinct outputs
starts at:  flux3

    flow-matching   ·            droid
    self-flow       ·            ·
    ·               flux3        ·
    flux3-video     flux-mimic   midtrain
    flux3-max       ·            flux3-action
