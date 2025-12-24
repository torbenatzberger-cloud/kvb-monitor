import { Dispatch, SetStateAction } from 'react';

interface LineFilterProps {
  availableLines: string[];
  selectedLines: string[];
  onChange: Dispatch<SetStateAction<string[]>> | ((lines: string[]) => void);
  getLineColor?: (line: string) => string;
}

export default function LineFilter(props: LineFilterProps): JSX.Element;
