/**
 * Maps the block names a human writes in atlas.md (::tree, :::bars …) to components.
 * To add a block: write the component, register it here, describe it in
 * engine/content/widgets.ts and document it in human/README.md.
 */
import type { ComponentType } from 'react';
import type { Atlas, Hero } from '../../content/types';
import type { DirectiveName, HeroWidgetName } from '../../content/widgets';
import { Timeline } from '../components/Timeline';
import { TreeView, type AtlasState } from '../components/TreeView';
import { ArmSchematic } from './ArmSchematic';
import { ControlLoop } from './ControlLoop';
import { NoiseField } from './NoiseField';
import { Bars, Callout, SourceIndex } from './simple';

export interface BlockProps {
  atlas: Atlas;
  state: AtlasState;
  args: string;
  body: string;
}

export const BLOCKS: Record<DirectiveName, ComponentType<BlockProps>> = {
  tree: ({ atlas, state }) => <TreeView atlas={atlas} state={state} />,
  timeline: ({ atlas, state }) => (
    <div className="graph-box standalone">
      <Timeline atlas={atlas} selected={state.selected} onSelect={(id) => state.select(id, { view: 'timeline' })} />
    </div>
  ),
  sources: ({ atlas }) => <SourceIndex atlas={atlas} />,
  bars: ({ args, body }) => <Bars args={args} body={body} />,
  'control-loop': ({ args, body, atlas }) => <ControlLoop args={args} body={body} atlas={atlas.slug} />,
  callout: ({ args, body, atlas }) => <Callout args={args} body={body} atlas={atlas.slug} />,
};

/** Blocks that count as a figure: in a "layout: split" section they sit beside the text. */
export const FIGURES = new Set<string>(['bars', 'callout']);

export const HEROES: Record<HeroWidgetName, ComponentType<{ hero: Hero }>> = {
  'arm-schematic': ArmSchematic,
  'noise-field': NoiseField,
};
