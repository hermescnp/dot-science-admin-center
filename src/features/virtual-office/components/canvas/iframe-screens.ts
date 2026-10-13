export interface IframeScreenConfig {
  id: string;
  /** Runtime name of the quad mesh the screen is mapped onto. */
  meshName: string;
  /** Zone in which the live iframe replaces the static texture and becomes interactive. */
  zoneKey: string;
  url: string;
  title: string;
  /** Screenshot of `url`, shown on the mesh outside the zone. */
  texturePath: string;
  /** CSS width the iframe is laid out at; its height follows the mesh's aspect ratio. */
  frameWidth: number;
}

export const IFRAME_SCREENS: IframeScreenConfig[] = [
  {
    id: 'studio-tv',
    meshName: 'Object_777_2',
    zoneKey: 'musicportfolio',
    url: 'https://dotscience.ai',
    title: 'dotscience.ai',
    texturePath: '/textures/dotscience-website.jpg',
    frameWidth: 1280
  }
];
