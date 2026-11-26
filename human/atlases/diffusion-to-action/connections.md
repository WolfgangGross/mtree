# Connections

<!--
Read every line as a sentence: the later idea, a verb, the earlier idea, then why.
  - Diffusion Policy builds on DDPM: it applies conditional denoising to action sequences.
The verbs and how they are drawn are defined in kinds.md.
You can name milestones by title or by id.
-->

## Inside diffusion

- DDPM builds on Diffusion models: DDPM develops the learned reverse-diffusion framework.
- DDIM sampling builds on DDPM: DDIM reuses a DDPM training objective and changes sampling.
- Latent diffusion builds on DDPM: Latent diffusion runs the denoising objective in an encoded space.
- Classifier-free guidance relates to DDPM: Guidance adds control over conditional diffusion samples.
- Diffusion Transformer builds on Latent diffusion: DiT operates on patches from a pretrained image autoencoder.

## Into images and video

- Multimodal DiT builds on Flow matching: SD3 uses a rectified-flow objective.
- Multimodal DiT relates to Diffusion Transformer: A latent transformer becomes a model with text and image streams.
- Stable Video Diffusion builds on Latent diffusion: Stable Video Diffusion adapts latent image generation to video.
- Stable Video Diffusion relates to Video diffusion: Both use temporal processing to make motion coherent.
- Sora research preview relates to Video diffusion: Temporal denoising scales from clips to variable-duration video.
- Sora research preview relates to Diffusion Transformer: Sora applies a diffusion transformer to compressed space–time patches.
- FLUX.1 builds on Flow matching: BFL identifies flow matching as part of the FLUX.1 recipe.
- FLUX.1 relates to Multimodal DiT: Both combine flow training with multimodal transformer designs.

## Into robot learning

- Diffuser builds on DDPM: Diffuser applies denoising diffusion to trajectories.
- Diffusion Policy builds on DDPM: Diffusion Policy applies conditional denoising to action sequences.
- UniPi relates to Visual foresight: Both use predicted frames in planning, with opposite directions of inference.
- UniPi relates to Video diffusion: Video generation supplies candidate visual plans.
- Diffusion Policy relates to Diffuser: Trajectory sampling and visuomotor action sampling share a generative formulation.
- GR-1 relates to UniPi: A separate inverse model and joint prediction are alternative ways to link visual futures to action.
- π₀ relates to RT-2: Both adapt a vision-language backbone to output robot commands.
- π₀ relates to Diffusion Policy: Both generate continuous action chunks conditioned on observations.
- π₀ builds on Flow matching: The continuous action expert is trained with flow matching.
- DreamZero relates to GR-1: Both forecast future observations and robot actions.

## The FLUX 3 family

- FLUX 3 backbone relates to FLUX.1: Earlier BFL image models provide family context.
- Self-Flow builds on Flow matching: Self-Flow augments flow matching with a representation objective.
- FLUX 3 Action relates to DreamZero: Both adapt predictive video representations for joint video–action generation.
- FLUX 3 backbone builds on Self-Flow: BFL states that FLUX 3 builds on Self-Flow.
- FLUX-mimic builds on FLUX 3 backbone: mimic obtained early access to BFL’s FLUX 3 backbone.
- FLUX 3 Video builds on FLUX 3 backbone: The public video release exposes the backbone’s generation capabilities.
- Action midtraining builds on FLUX 3 backbone: BFL continues audiovisual pretraining with action-aligned samples.
- FLUX 3 Action builds on Action midtraining: Target-specific training and distillation produce deployable policies.
- FLUX 3 Action builds on DROID: DROID provides target-embodiment data for the DROID checkpoint.
- FLUX 3 Max builds on FLUX 3 Video: fal post-trained FLUX 3 for its Max video release.
- FLUX 3 Action builds on Classifier-free guidance: The distilled DROID variants absorb the extra guidance evaluation.
