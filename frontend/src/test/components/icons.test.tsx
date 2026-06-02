import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as Icons from '../../components/icons';

const ICON_NAMES = [
  'AddIcon', 'EditIcon', 'DeleteIcon', 'CloseIcon', 'SearchIcon',
  'FilterIcon', 'HomeIcon', 'PersonIcon', 'DocumentIcon', 'CheckIcon',
  'LogoutIcon', 'UploadIcon', 'DownloadIcon', 'VisibilityIcon', 'BackIcon',
  'ShieldIcon', 'GroupIcon', 'VerifiedIcon', 'SunIcon', 'MoonIcon',
] as const;

type IconName = (typeof ICON_NAMES)[number];

describe('Icons', () => {
  it.each(ICON_NAMES)('renderiza %s como SVG', (name) => {
    const Icon = (Icons as Record<IconName, React.FC>)[name];
    const { container } = render(<Icon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('aplica className customizado', () => {
    const { container } = render(<Icons.AddIcon className="h-8 w-8" />);
    expect(container.querySelector('svg')).toHaveClass('h-8 w-8');
  });

  it('aplica aria-label quando fornecido', () => {
    const { container } = render(<Icons.SearchIcon aria-label="Buscar" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Buscar');
  });
});
