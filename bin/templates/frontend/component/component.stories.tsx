import { Meta, StoryObj } from '@storybook/react';
import  Component from './component';

const meta: Meta<typeof Component> = {
  title: 'Example/Component',
  component: Component,
  tags: ['autodocs'],
  argTypes: {
    className: { control: 'text' },
    style: { control: 'object' },
    children: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {
  args: {
    children: 'Hello, I am a component!',
    className: 'custom-class',
    style: { backgroundColor: '#eee', padding: '10px' },
  },
};
