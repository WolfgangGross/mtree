# Milestones

<!--
One "## Title" per milestone. Under it:
  id:       short name used in branches.md layouts and in [[links]]
  date:     as you would write it: Mar 2015, 2021–22, Sep–Oct 2022
  kind:     one of the kinds in kinds.md
  sources:  library ids (files in human/library), separated by commas
Then one sentence: what did this unlock? Then any "### Part" you like.
-->

<!-- ============================================================
     Diffusion
     ============================================================ -->

## Diffusion models
id:       thermo
date:     Mar 2015
kind:     diffusion
sources:  sohl-dickstein-2015

Turn a hard sampling problem into many small reverse steps.

### Mechanism
Repeatedly corrupt a training example until its distribution resembles simple noise. Learn the reverse transitions. Sampling then starts from a distribution we already know how to draw from.

### Why it matters
The training set supplies clean images. The designer supplies the corruption process. Together they define a supervised signal for learning to reverse it.

## DDPM
id:       ddpm
date:     Jun 2020
kind:     diffusion
sources:  ddpm

Predict the noise that was added to a training image.

### Mechanism
Pick a clean image, draw Gaussian noise and choose a random noise level. A network sees the noisy image and level and estimates the exact sampled noise. At inference its estimates guide repeated reverse steps.

### Why it matters
The same network learns both the coarse structure visible at high noise and the small corrections needed near the end of sampling.

## DDIM sampling
id:       ddim
date:     Oct 2020
kind:     diffusion
sources:  ddim

Change the sampler while reusing the trained denoiser.

### Mechanism
DDIM constructs alternative reverse processes compatible with the DDPM training objective. A deterministic variant can traverse a shorter sequence of noise levels, trading model evaluations against fidelity.

### Why it matters
Training and inference have separate design choices. Reducing the number of sampling steps becomes particularly valuable when a real robot is waiting for a command.

## Classifier-free guidance
id:       cfg
date:     2021–22
kind:     diffusion
sources:  classifier-free-guidance

Adjust how strongly a generated sample follows its condition.

### Mechanism
During training, sometimes drop the conditioning input. At sampling time, evaluate the model with and without the condition and amplify the difference. Stronger guidance trades diversity for closer adherence.

### Why it matters
A text prompt can steer an image or clip more strongly. Two evaluations per step also create a reason to distill guidance into a single evaluation.

## Latent diffusion
id:       ldm
date:     Dec 2021
kind:     diffusion
sources:  latent-diffusion

Do the expensive generative work on a compressed image.

### Mechanism
Train an autoencoder to map pixels into a smaller spatial array and back. Learn the denoising process in that array. Cross-attention lets noisy image features query text embeddings throughout generation.

### Why it matters
The decoder reconstructs fine texture from a sampled latent. The denoiser gets a much smaller spatial problem, at the cost of detail that the autoencoder discards.

## Flow matching
id:       flow-matching
date:     Sep–Oct 2022
kind:     diffusion
sources:  rectified-flow, flow-matching

Learn a velocity field that transports noise into data.

### Mechanism
For a simple straight training path, mix a noise vector ε and a data example x as z(t) = (1 − t)ε + tx. Regress the target velocity x − ε from z(t) and t. At inference, a numerical solver follows the learned field.

### Why it matters
The same recipe can transport noise into a compressed image or a continuous vector of robot commands. Straight training paths can still produce a curved learned sampling trajectory.

## Diffusion Transformer
id:       dit
date:     Dec 2022
kind:     diffusion
sources:  dit

Run the denoiser as a transformer over latent patches.

### Mechanism
DiT splits the autoencoder’s spatial latent into patches, embeds them as tokens, then uses transformer blocks to predict the diffusion target. Time and class information condition the network.

### Why it matters
The paper measures how sample quality changes with forward-pass compute. This gives visual generation a concrete architecture and scaling experiment that later video work can extend.

<!-- ============================================================
     Vision & video
     ============================================================ -->

## Multimodal DiT
id:       sd3
date:     Mar 2024
kind:     video
sources:  sd3

Let text and image tokens exchange information through joint attention.

### Mechanism
The Stable Diffusion 3 research combines rectified-flow training with a transformer that gives text and image representations their own weights while letting their tokens attend to one another.

### Why it matters
Stream-specific weights can process words and image patches differently while the attention operation aligns them. This is one architectural precedent for the early FLUX family.

## Video diffusion
id:       video-diffusion
date:     Apr 2022
kind:     video
sources:  video-diffusion-models

Denoise a clip as a space–time object.

### Mechanism
A video network processes spatial information within frames and temporal relationships across frames. The authors train with both images and videos and can condition generation on observed frames.

### Why it matters
If a gripper occludes a cube, later frames must remain consistent with its earlier location. Independently sampling plausible still images gives no mechanism to preserve that relationship.

## Stable Video Diffusion
id:       svd
date:     Nov 2023
kind:     video
sources:  stable-video-diffusion

Adapt an image model to motion in stages.

### Mechanism
Start with text-to-image pretraining, train on a large video collection, then fine-tune on higher-quality clips. The paper studies how filtering, captioning and training stages influence motion synthesis.

### Why it matters
An image model already knows what a hand looks like. Clips supply evidence about how the fingers and the objects they touch move together.

## Sora research preview
id:       sora
date:     Feb 2024
kind:     video
sources:  sora

Represent clips of different shapes as space–time patches.

### Mechanism
OpenAI describes compressing video in space and time, then treating patches of the compressed representation as transformer tokens. A shared representation accommodates different clip lengths, resolutions and aspect ratios.

### Why it matters
Object permanence can emerge in generated clips, but the report also shows physical errors, including incorrect object-state changes after a bite. Visual plausibility alone gives a robot no motor targets.

## FLUX.1
id:       flux1
date:     Aug 2024
kind:     video
sources:  flux1

Bring flow matching and a hybrid transformer into one image family.

### Mechanism
BFL described 12B-parameter text-to-image models combining multimodal and parallel diffusion transformer blocks. The family used flow matching, with distilled variants for different inference budgets.

### Why it matters
This is an earlier BFL image architecture. The published lineage to the FLUX 3 training method becomes explicit at Self-Flow.

<!-- ============================================================
     Robot learning
     ============================================================ -->

## Visual foresight
id:       foresight
date:     Oct 2016
kind:     robot
sources:  visual-foresight

Use predicted camera views to choose a command.

### Mechanism
Train a forward model on robot interactions. For several candidate commands, predict where a marked pixel will move. A model-predictive controller chooses a trajectory that approaches the goal and replans from a new camera image.

### Why it matters
The question runs from actions to consequences. Given a particular push, where will the object end up? The controller can compare answers before it moves.

## Diffuser
id:       diffuser
date:     May 2022
kind:     robot
sources:  diffuser

Generate a whole candidate trajectory through denoising.

### Mechanism
Diffuser represents a sequence of states and actions as one generative object. Conditioning constrains parts of a trajectory, such as start and goal. Reward guidance can favor trajectories with better outcomes.

### Why it matters
In a maze, sampling a path can preserve the choice to pass left or right. Averaging two valid paths could produce a path through the wall.

## UniPi
id:       unipi
date:     Jan 2023
kind:     robot
sources:  unipi

Generate a video plan, then infer executable actions.

### Mechanism
A text-conditioned video model proposes what successful execution would look like. A separate inverse-dynamics model learns which action could connect those visual states on a particular robot.

### Why it matters
For “put the cube in the bowl,” the video gives visual waypoints. Paired robot observations and controls teach the inverse model how this arm could get from one waypoint to the next.

## Diffusion Policy
id:       diffusion-policy
date:     Mar 2023
kind:     robot
sources:  diffusion-policy

Denoise a sequence of robot commands.

### Mechanism
Condition a denoiser on recent observations and train it on action sequences from demonstrations. At inference it starts with a noisy action chunk, refines it, executes a prefix, then replans using fresh observations.

### Why it matters
Two demonstrations may grasp the same object from opposite sides. Sampling a coherent approach preserves either strategy. Averaging the two commands can send the gripper straight into the object.

## RT-2
id:       rt2
date:     Jul 2023
kind:     robot
sources:  rt2

Teach a vision-language model to emit robot actions as tokens.

### Mechanism
RT-2 discretizes components of a robot command into bins and represents them using tokens. Co-training on web vision-language tasks and robot demonstrations transfers semantic knowledge into manipulation.

### Why it matters
A web-trained model may recognize what counts as a snack. Demonstrations connect that semantic choice to the commands needed to reach for it.

## GR-1
id:       gr1
date:     Dec 2023
kind:     robot
sources:  gr1

Train one transformer to forecast vision and robot action.

### Mechanism
GR-1 first learns video prediction, then adapts to robot trajectories. During adaptation, language, visual history and robot state condition predictions of future images and actions.

### Why it matters
Predicting the next view encourages the network to track the object as it predicts motion. GR-1 demonstrates this principle with a GPT-style model before later diffusion-based world-action models.

## DROID
id:       droid
date:     Mar 2024
kind:     robot
sources:  droid, flux3-action-droid

Record what the robot saw alongside what it actually did.

### Mechanism
The DROID collaboration collected about 76,000 demonstration trajectories across 564 scenes with a shared manipulation setup. Robot state, actions and camera observations can be aligned on a common timeline.

### Why it matters
A video of a successful grasp omits the exact joint commands. DROID provides paired measurements for learning that mapping. BFL uses DROID when adapting and evaluating its policy.

## π₀
id:       pi0
date:     Oct 2024
kind:     robot
sources:  pi0

Give a vision-language model a continuous action expert.

### Mechanism
Physical Intelligence uses a pretrained vision-language backbone to encode the scene and instruction. A flow-matching action expert generates a chunk of continuous controls conditioned on those features.

### Why it matters
A robot can execute the values in a sampled chunk at its control frequency. That is a different quantity from the frequency at which the model can generate a fresh chunk.

## DreamZero
id:       dreamzero
date:     Feb 2026
kind:     robot
sources:  dreamzero

Generate a visual future and its corresponding commands together.

### Mechanism
DreamZero adapts a pretrained video diffusion model to predict future video and robot actions jointly. Action predictions can draw on patterns of motion already learned from large video collections.

### Why it matters
The authors describe a 14B world-action model and report 7 Hz closed-loop operation in their setup. It is a research precedent for the joint-prediction approach evaluated by BFL.

<!-- ============================================================
     The FLUX family
     ============================================================ -->

## Self-Flow
id:       self-flow
date:     Mar 2026
kind:     flux
sources:  self-flow, flux3

Learn semantic features while learning to generate.

### Mechanism
The student sees tokens corrupted to different degrees. A teacher derived from the model sees a cleaner view. Alongside predicting flow velocity, the student learns to match the teacher’s features.

### Why it matters
Partly obscured tokens must be interpreted using the rest of the scene. BFL tested the method across image, video and audio synthesis and identifies it as a foundation for FLUX 3.

## FLUX 3 backbone
id:       flux3
date:     Jul 2026
kind:     flux
sources:  flux3, flux3-action

Pretrain a shared foundation across images, video and audio.

### Mechanism
BFL scaled Self-Flow training across all three modalities. The model learns temporal and cross-modal regularities before downstream specialization. In the Action report’s pretraining mix, video accounts for over 95% of tokens.

### Why it matters
A closing gripper and a moving cube frequently appear together. That association provides a prior about motion. The arm-specific relationship between observations and commands comes from aligned action data.

## FLUX-mimic
id:       flux-mimic
date:     Jul 2026
kind:     flux
sources:  flux3-mimic, flux3

Read robot actions from a video model’s internal features.

### Mechanism
BFL and mimic connected a specialized action decoder to the early FLUX 3 backbone. The decoder can use predictive visual features without waiting for a full video to be decoded at inference.

### Why it matters
This July collaboration explored how a video backbone could drive a robot. The September FLUX 3 Action release uses joint video–action generation, a separate branch of the same family.

## FLUX 3 Video
id:       flux3-video
date:     Aug 2026
kind:     flux
sources:  flux3-video, flux3-video-max

Generate coordinated motion and sound from text or keyframes.

### Mechanism
The initial public release could create up to 20 seconds of HD video and native audio. An initial image or ordered keyframes can constrain the shot. A preceding audiovisual clip can condition a continuation.

### Why it matters
If the goal is footage of an arm placing a cube, the output is a clip. The video interface supplies no embodiment-specific sequence of motor commands.

## Action midtraining
id:       midtrain
date:     Sep 2026 report
kind:     flux
sources:  flux3-action, flux3-action-hf

Pair observed motion with aligned controls across embodiments.

### Mechanism
BFL continued training with audiovisual samples and action-aligned data from games, hand tracking, handheld grippers and teleoperated robots. Pose and gripper targets provide a common representation for many embodiments.

### Why it matters
On a new robot, joint limits, camera placement and action coordinates can differ. The final adaptation teaches the policy how to express the shared task in that robot’s action space.

## FLUX 3 Max
id:       flux3-max
date:     Oct 2026
kind:     flux
sources:  fal-flux3-max, flux3-video-max

Reduce the time from a prompt or image to a finished clip.

### Mechanism
fal Research post-trained the FLUX 3 video model with BFL and optimized inference. fal reports a 10-second clip in 12.45 seconds in its benchmark. The public announcement describes the optimization at a high level.

### Why it matters
Here latency is wall-clock time to render a requested clip. In robot control, time to produce the next usable command and recovery after unexpected motion are more informative measures.

## FLUX 3 Action
id:       flux3-action
date:     Sep 2026
kind:     flux
sources:  flux3-action-code, flux3-action-droid, flux3-action-so101, flux3-action

Jointly predict future views and executable controls.

### Mechanism
Camera observations, robot state and a text instruction condition a 7B world-action model. Its public DROID policies include a base four-step model, a guidance-distilled four-step model and a one-step variant for faster inference.

### Why it matters
One DROID prediction covers 32 actions at 15 Hz, about 2.13 seconds of motion. The controller can execute a shorter prefix and take a fresh observation. BFL publishes separate DROID and SO-101 policies.
