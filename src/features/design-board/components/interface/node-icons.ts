import { Icons, type Icon } from '@/components/icons';
import type { NodeType } from '../../api/types';

export const NODE_ICONS: Record<NodeType, Icon> = {
  section: Icons.square,
  button: Icons.handClick,
  form: Icons.formElement,
  field: Icons.cursorText,
  text: Icons.text,
  'data-display': Icons.chartBar,
  'column-layout': Icons.layoutColumns,
  list: Icons.bulletList,
  'search-bar': Icons.searchInput,
  'tabs-bar': Icons.tabsBar,
  'image-carousel': Icons.carousel
};
