import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  AddIcon, EditIcon, DeleteIcon, CloseIcon, SearchIcon, FilterIcon,
  HomeIcon, PersonIcon, DocumentIcon, CheckIcon, LogoutIcon,
  UploadIcon, DownloadIcon, VisibilityIcon, BackIcon,
  ShieldIcon, GroupIcon, VerifiedIcon, SunIcon, MoonIcon,
} from '../../components/icons';

describe('Icons', () => {
  it('renderiza AddIcon como SVG', () => {
    const { container } = render(<AddIcon />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renderiza EditIcon', () => {
    const { container } = render(<EditIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza DeleteIcon', () => {
    const { container } = render(<DeleteIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza CloseIcon', () => {
    const { container } = render(<CloseIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza SearchIcon', () => {
    const { container } = render(<SearchIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza FilterIcon', () => {
    const { container } = render(<FilterIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza HomeIcon', () => {
    const { container } = render(<HomeIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza PersonIcon', () => {
    const { container } = render(<PersonIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza DocumentIcon', () => {
    const { container } = render(<DocumentIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza CheckIcon', () => {
    const { container } = render(<CheckIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza LogoutIcon', () => {
    const { container } = render(<LogoutIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza UploadIcon', () => {
    const { container } = render(<UploadIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza DownloadIcon', () => {
    const { container } = render(<DownloadIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza VisibilityIcon', () => {
    const { container } = render(<VisibilityIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza BackIcon', () => {
    const { container } = render(<BackIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza ShieldIcon', () => {
    const { container } = render(<ShieldIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza GroupIcon', () => {
    const { container } = render(<GroupIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza VerifiedIcon', () => {
    const { container } = render(<VerifiedIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza SunIcon', () => {
    const { container } = render(<SunIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renderiza MoonIcon', () => {
    const { container } = render(<MoonIcon />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('aplica className customizado', () => {
    const { container } = render(<AddIcon className="h-8 w-8" />);
    expect(container.querySelector('svg')).toHaveClass('h-8 w-8');
  });

  it('aplica aria-label quando fornecido', () => {
    const { container } = render(<SearchIcon aria-label="Buscar" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Buscar');
  });
});
