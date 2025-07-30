import React, { useState, useMemo } from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../../components/ui/dialog";
import { Filter, Download, X } from "lucide-react";
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

// Sample data structure
interface AudienceRecord {
  id: string;
  name: string;
  phoneNumber: string;
  status: 'Active' | 'Inactive' | 'Pending' | 'Blocked';
  tries: number;
  lastContact: string;
  campaign: string;
}

// Sample data
const sampleData: AudienceRecord[] = [
  { id: '1', name: 'Fouad', phoneNumber: '97123456789', status: 'Active', tries: 3, lastContact: '2024-01-15', campaign: 'Campaign A' },
  { id: '2', name: 'David', phoneNumber: '97123344567', status: 'Pending', tries: 1, lastContact: '2024-01-14', campaign: 'Campaign B' },
  { id: '3', name: 'Ali', phoneNumber: '96623344555', status: 'Inactive', tries: 5, lastContact: '2024-01-13', campaign: 'Campaign A' },
  { id: '4', name: 'John', phoneNumber: '+12345678910', status: 'Active', tries: 2, lastContact: '2024-01-12', campaign: 'Campaign C' },
  { id: '5', name: 'Sarah', phoneNumber: '97123456788', status: 'Blocked', tries: 7, lastContact: '2024-01-11', campaign: 'Campaign B' },
  { id: '6', name: 'Mike', phoneNumber: '97123344566', status: 'Active', tries: 1, lastContact: '2024-01-10', campaign: 'Campaign A' },
];

interface FilterState {
  status: string;
  minTries: string;
  maxTries: string;
  phoneNumber: string;
}

export const AudienceTableSection = (): JSX.Element => {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    minTries: '',
    maxTries: '',
    phoneNumber: ''
  });

  // Filter the data based on current filter state
  const filteredData = useMemo(() => {
    return sampleData.filter(record => {
      // Status filter
      if (filters.status && record.status !== filters.status) {
        return false;
      }

      // Tries filter
      if (filters.minTries && record.tries < parseInt(filters.minTries)) {
        return false;
      }
      if (filters.maxTries && record.tries > parseInt(filters.maxTries)) {
        return false;
      }

      // Phone number filter
      if (filters.phoneNumber && !record.phoneNumber.toLowerCase().includes(filters.phoneNumber.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [filters]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredData.map(record => record.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (recordId: string, checked: boolean) => {
    if (checked) {
      setSelectedRows(prev => [...prev, recordId]);
    } else {
      setSelectedRows(prev => prev.filter(id => id !== recordId));
    }
  };

  const handleExport = () => {
    const dataToExport = selectedRows.length > 0 
      ? filteredData.filter(record => selectedRows.includes(record.id))
      : filteredData;

    if (dataToExport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audience Data');
    
    const fileName = `audience_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast.success(`Exported ${dataToExport.length} records successfully`);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      minTries: '',
      maxTries: '',
      phoneNumber: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');
  const isAllSelected = selectedRows.length === filteredData.length && filteredData.length > 0;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < filteredData.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Audience Management</CardTitle>
          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-2 ${hasActiveFilters ? 'border-blue-500 text-blue-600' : ''}`}
                >
                  <Filter className="h-4 w-4" />
                  Filter
                  {hasActiveFilters && (
                    <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                      {Object.values(filters).filter(v => v !== '').length}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    Filter Options
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Clear All
                      </Button>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Filter by Status</label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => handleFilterChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Statuses</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Number of Tries Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Filter by Number of Tries</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Select
                          value={filters.minTries}
                          onValueChange={(value) => handleFilterChange('minTries', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Min tries" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No min</SelectItem>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                              <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Select
                          value={filters.maxTries}
                          onValueChange={(value) => handleFilterChange('maxTries', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Max tries" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No max</SelectItem>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                              <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Phone Number Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Filter by Phone Number</label>
                    <input
                      type="text"
                      placeholder="Enter phone number or part of it"
                      value={filters.phoneNumber}
                      onChange={(e) => handleFilterChange('phoneNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              size="sm"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="h-4 w-4" />
              Export ({selectedRows.length > 0 ? selectedRows.length : filteredData.length})
            </Button>
          </div>
        </div>
        
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-2">
            {filters.status && (
              <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                Status: {filters.status}
                <button
                  onClick={() => handleFilterChange('status', '')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {(filters.minTries || filters.maxTries) && (
              <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                Tries: {filters.minTries || '0'}-{filters.maxTries || '∞'}
                <button
                  onClick={() => {
                    handleFilterChange('minTries', '');
                    handleFilterChange('maxTries', '');
                  }}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.phoneNumber && (
              <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                Phone: {filters.phoneNumber}
                <button
                  onClick={() => handleFilterChange('phoneNumber', '')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tries</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Campaign</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    {hasActiveFilters ? 'No records match the current filters' : 'No data available'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(record.id)}
                        onCheckedChange={(checked) => handleSelectRow(record.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell>{record.phoneNumber}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Active' ? 'bg-green-100 text-green-800' :
                        record.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                        record.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.tries <= 2 ? 'bg-green-100 text-green-800' :
                        record.tries <= 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.tries}
                      </span>
                    </TableCell>
                    <TableCell>{record.lastContact}</TableCell>
                    <TableCell>{record.campaign}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>
              Showing {filteredData.length} of {sampleData.length} records
              {selectedRows.length > 0 && ` (${selectedRows.length} selected)`}
            </div>
            {hasActiveFilters && (
              <div className="text-blue-600">
                Filtered results
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};