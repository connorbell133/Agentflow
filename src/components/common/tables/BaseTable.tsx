'use client';

import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

interface TableProps<T> {
  data: T[];
  headers: string[];
  renderRow: (item: T, index: number, toggleSelect: (id: string) => void) => JSX.Element;
  getId: (item: T) => string;
  footerRow?: JSX.Element;
}

const GenericTable = <T extends unknown>({
  data,
  headers,
  renderRow,
  getId,
  footerRow,
}: TableProps<T>) => {
  const [selectedAll, setSelectedAll] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleSelectAll = () => {
    setSelectedAll(!selectedAll);
    setSelectedItems(!selectedAll ? data.map(getId) : []);
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              {headers.map((header, idx) => (
                <TableHead key={idx} className="px-6 py-3 text-xs uppercase">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => renderRow(item, index, toggleSelectItem))}
            {footerRow && (
              <TableRow>
                <TableCell colSpan={headers.length}>{footerRow}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GenericTable;
