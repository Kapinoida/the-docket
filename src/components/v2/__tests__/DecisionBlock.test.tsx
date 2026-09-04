import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DecisionBlock from '../editor/DecisionBlock';
import type { DecisionAttrs } from '../editor/DecisionBlock';

function makeAttrs(overrides: Partial<DecisionAttrs> = {}): DecisionAttrs {
  return {
    id: 'dec_test',
    title: 'Test Decision',
    status: 'active',
    context: 'Some context',
    options: 'Option A\nOption B',
    criteria: 'Cost\nQuality',
    choice: 'Option A',
    reasoning: 'It was cheaper',
    revisit_date: '',
    outcome: '',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

describe('DecisionBlock', () => {
  it('renders the decision title', () => {
    const updateAttributes = jest.fn();
    render(
      <DecisionBlock
        node={{ attrs: makeAttrs() }}
        updateAttributes={updateAttributes}
        selected={false}
      />,
    );

    expect(screen.getByText('Test Decision')).toBeTruthy();
  });

  it('renders untitled decision with placeholder', () => {
    const updateAttributes = jest.fn();
    render(
      <DecisionBlock
        node={{ attrs: makeAttrs({ title: '' }) }}
        updateAttributes={updateAttributes}
        selected={false}
      />,
    );

    expect(screen.getByText('Untitled Decision')).toBeTruthy();
  });

  it('renders status buttons', () => {
    const updateAttributes = jest.fn();
    render(
      <DecisionBlock
        node={{ attrs: makeAttrs() }}
        updateAttributes={updateAttributes}
        selected={false}
      />,
    );

    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Decided')).toBeTruthy();
    expect(screen.getByText('Reconsider')).toBeTruthy();
  });

  it('renders field labels', () => {
    const updateAttributes = jest.fn();
    render(
      <DecisionBlock
        node={{ attrs: makeAttrs() }}
        updateAttributes={updateAttributes}
        selected={false}
      />,
    );

    expect(screen.getByText('Context')).toBeTruthy();
    expect(screen.getByText('Options')).toBeTruthy();
    expect(screen.getByText('Criteria')).toBeTruthy();
    expect(screen.getByText('Choice')).toBeTruthy();
    expect(screen.getByText('Reasoning')).toBeTruthy();
    expect(screen.getByText('Revisit')).toBeTruthy();
    expect(screen.getByText('Outcome')).toBeTruthy();
  });

  it('renders context field value', () => {
    const updateAttributes = jest.fn();
    render(
      <DecisionBlock
        node={{ attrs: makeAttrs({ context: 'Need a decision about X' }) }}
        updateAttributes={updateAttributes}
        selected={false}
      />,
    );

    const contextInput = screen.getByPlaceholderText('Why does this decision exist?');
    expect((contextInput as HTMLTextAreaElement).value).toBe('Need a decision about X');
  });

  it('renders choice field value', () => {
    const updateAttributes = jest.fn();
    render(
      <DecisionBlock
        node={{ attrs: makeAttrs({ choice: 'Option B' }) }}
        updateAttributes={updateAttributes}
        selected={false}
      />,
    );

    const choiceInput = screen.getByPlaceholderText('What did you decide?');
    expect((choiceInput as HTMLInputElement).value).toBe('Option B');
  });

  it('calls updateAttributes when status changes', () => {
    const updateAttributes = jest.fn();
    render(
      <DecisionBlock
        node={{ attrs: makeAttrs() }}
        updateAttributes={updateAttributes}
        selected={false}
      />,
    );

    fireEvent.click(screen.getByText('Decided'));

    expect(updateAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'decided' }),
    );
  });

  it('renders options list items', () => {
    const updateAttributes = jest.fn();
    render(
      <DecisionBlock
        node={{ attrs: makeAttrs({ options: 'Alpha\nBeta\nGamma' }) }}
        updateAttributes={updateAttributes}
        selected={false}
      />,
    );

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getByText('Gamma')).toBeTruthy();
  });

  it('renders criteria list items', () => {
    const updateAttributes = jest.fn();
    render(
      <DecisionBlock
        node={{ attrs: makeAttrs({ criteria: 'Speed\nCost' }) }}
        updateAttributes={updateAttributes}
        selected={false}
      />,
    );

    expect(screen.getByText('Speed')).toBeTruthy();
    expect(screen.getByText('Cost')).toBeTruthy();
  });

  it('collapses when collapse button is clicked', () => {
    const updateAttributes = jest.fn();
    render(
      <DecisionBlock
        node={{ attrs: makeAttrs() }}
        updateAttributes={updateAttributes}
        selected={false}
      />,
    );

    const collapseButton = screen.getByTitle('Collapse');
    fireEvent.click(collapseButton);

    expect(screen.queryByText('Context')).toBeNull();
    expect(screen.getByText('Test Decision')).toBeTruthy();
  });

  it('renders revisit date when present', () => {
    const updateAttributes = jest.fn();
    render(
      <DecisionBlock
        node={{ attrs: makeAttrs({ revisit_date: '2026-10-15T12:00:00Z' }) }}
        updateAttributes={updateAttributes}
        selected={false}
      />,
    );

    const dateElements = screen.getAllByText(/Oct/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('shows selected ring when selected prop is true', () => {
    const updateAttributes = jest.fn();
    const { container } = render(
      <DecisionBlock
        node={{ attrs: makeAttrs() }}
        updateAttributes={updateAttributes}
        selected={true}
      />,
    );

    const wrapper = container.querySelector('[data-type="decision"]');
    expect(wrapper?.className).toContain('ring-2');
  });
});
