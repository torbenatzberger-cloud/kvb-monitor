import { Dispatch, SetStateAction } from 'react';

interface DirectionFilterProps {
  availableDirections: string[];
  selectedDirections: string[];
  onChange: Dispatch<SetStateAction<string[]>> | ((directions: string[]) => void);
  accentColor?: string;
}

export default function DirectionFilter(props: DirectionFilterProps): JSX.Element;
