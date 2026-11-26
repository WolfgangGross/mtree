# Denoising Diffusion Probabilistic Models

authors:    Jonathan Ho, Ajay Jain, Pieter Abbeel
published:  Jun 2020
type:       paper
arxiv:      2006.11239
code:       https://github.com/hojonathanho/diffusion
tags:       diffusion

## Notes

*Example note, written by Claude to show the format. Replace it with your own.*

The move that made diffusion practical: instead of predicting the mean of each reverse
step, predict the noise $\epsilon$ that was mixed in. Because
$x_t = \sqrt{\bar\alpha_t}\,x_0 + \sqrt{1-\bar\alpha_t}\,\epsilon$ can be sampled in one
shot, training becomes a plain regression [@ddpm, §3.4]:

$$L_\text{simple} = \mathbb{E}_{t,\,x_0,\,\epsilon}\left[\lVert \epsilon - \epsilon_\theta(x_t, t) \rVert^2\right]$$

- [[ddim]] keeps this training objective and only changes the sampler.
- [[ldm]] runs the same objective inside an autoencoder's latent space.

## Highlights

- §3.2 — "optimizing an objective resembling denoising score matching is equivalent to using variational inference" — the bridge to score matching.
- §4.1 — "we obtain an Inception score of 9.46 and a state-of-the-art FID score of 3.17" — CIFAR10.
- Figure 1 — Samples on CelebA-HQ and CIFAR10.
