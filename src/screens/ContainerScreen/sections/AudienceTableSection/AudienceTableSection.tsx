import React, { useState, useMemo, useCallback } from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Checkbox } from "../../../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import { 
  Download, 
  Filter, 
  X, 
  Search,
  RotateCcw
} from "lucide-react";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

// Types for audience data
interface AudienceData {
  id: string;
  name: string;
  phoneNumber: string;
  status: "Queued" | "Stopped" | "Serviced" | "Maxed" | "Trying";
  tries: number;
  lastContact?: string;
}

// Filter types
interface FilterState {
  status: string[];
  phoneNumber: string;
  triesRange: string;
}

// Sample data - in a real app, this would come from an API
const sampleAudienceData: AudienceData[] = [
  { id: "1", name: "Fouad", phoneNumber: "97123456789", status: "Queued", tries: 0 },
  { id: "2", name: "David", phoneNumber: "97123344567", status: "Trying", tries: 2 },
  { id: "3", name: "Ali", phoneNumber: "96623344555", status: "Serviced", tries: 1 },
  { id: "4", name: "John", phoneNumber: "+12345678910", status: "Maxed", tries: 5 },
  { id: "5", name: "Sarah", phoneNumber: "97123456790", status: "Stopped", tries: 3 },
  { id: "6", name: "Mike", phoneNumber: "97123456791", status: "Queued", tries: 0 },
  { id: "7", name: "Emma", phoneNumber: "97123456792", status: "Trying", tries: 1 },
  { id: "8", name: "James", phoneNumber: "97123456793", status: "Serviced", tries: 2 },
];

const statusOptions = ["Queued", "Stopped", "Serviced", "Maxed", "Trying"];
const triesRangeOptions = [
  { value: "all", label: "All" },
  { value: "0", label: "0 tries" },
  { value: "1-3", label: "1-3 tries" },
  { value: "4-10", label: "4-10 tries" },
  { value: "10+", label: "10+ tries" },
];

export const AudienceTableSection = (): JSX.Element => {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    phoneNumber: "",
    triesRange: "all",
  });

  // Debounced phone number filter
  const [phoneNumberInput, setPhoneNumberInput] = useState("");
  const [phoneNumberDebounced, setPhoneNumberDebounced] = useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPhoneNumberDebounced(phoneNumberInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [phoneNumberInput]);

  React.useEffect(() => {
    setFilters(prev => ({ ...prev, phoneNumber: phoneNumberDebounced }));
  }, [phoneNumberDebounced]);

  // Filter logic
  const filteredData = useMemo(() => {
    return sampleAudienceData.filter((item) => {
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(item.status)) {
        return false;
      }

      // Phone number filter
      if (filters.phoneNumber && !item.phoneNumber.toLowerCase().includes(filters.phoneNumber.toLowerCase())) {
        return false;
      }

      // Tries range filter
      if (filters.triesRange !== "all") {
        if (filters.triesRange === "0" && item.tries !== 0) return false;
        if (filters.triesRange === "1-3" && (item.tries < 1 || item.tries > 3)) return false;
        if (filters.triesRange === "4-10" && (item.tries < 4 || item.tries > 10)) return false;
        if (filters.triesRange === "10+" && item.tries <= 10) return false;
      }

      return true;
    });
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.phoneNumber) count++;
    if (filters.triesRange !== "all") count++;
    return count;
  }, [filters]);

  // Handle row selection
  const handleRowSelect = useCallback((rowId: string) => {
    setSelectedRows(prev => 
      prev.includes(rowId) 
        ? prev.filter(id => id !== rowId)
        : [...prev, rowId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedRows(prev => 
      prev.length === filteredData.length 
        ? [] 
        : filteredData.map(item => item.id)
    );
  }, [filteredData]);

  // Filter handlers
  const handleStatusFilter = useCallback((status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  }, []);

  const handleTriesRangeFilter = useCallback((range: string) => {
    setFilters(prev => ({ ...prev, triesRange: range }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      status: [],
      phoneNumber: "",
      triesRange: "all",
    });
    setPhoneNumberInput("");
    setPhoneNumberDebounced("");
  }, []);

  // Export functionality
  const handleExport = useCallback(() => {
    try {
      const dataToExport = selectedRows.length > 0 
        ? filteredData.filter(item => selectedRows.includes(item.id))
        : filteredData;

      const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(item => ({
        Name: item.name,
        "Phone Number": item.phoneNumber,
        Status: item.status,
        Tries: item.tries,
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Audience Data");
      
      const fileName = `audience_data_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success(`Exported ${dataToExport.length} records successfully!`);
    } catch (error) {
      toast.error("Failed to export data. Please try again.");
    }
  }, [selectedRows, filteredData]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Queued": return "bg-blue-100 text-blue-800";
      case "Trying": return "bg-yellow-100 text-yellow-800";
      case "Serviced": return "bg-green-100 text-green-800";
      case "Maxed": return "bg-red-100 text-red-800";
      case "Stopped": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Audience Data</CardTitle>
          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="relative"
                  aria-label={`Filter audience data${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    Filter Audience Data
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-sm"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Status Filter */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Status</label>
                    <div className="space-y-2">
                      {statusOptions.map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={filters.status.includes(status)}
                            onCheckedChange={() => handleStatusFilter(status)}
                          />
                          <label
                            htmlFor={`status-${status}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {status}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phone Number Filter */}
                  <div>
                    <label htmlFor="phone-filter" className="text-sm font-medium mb-3 block">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        id="phone-filter"
                        type="text"
                        placeholder="Search phone numbers..."
                        value={phoneNumberInput}
                        onChange={(e) => setPhoneNumberInput(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {phoneNumberInput && (
                        <button
                          onClick={() => {
                            setPhoneNumberInput("");
                            setPhoneNumberDebounced("");
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          aria-label="Clear phone number filter"
                        >
                          <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Number of Tries Filter */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Number of Tries</label>
                    <Select value={filters.triesRange} onValueChange={handleTriesRangeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tries range" />
                      </SelectTrigger>
                      <SelectContent>
                        {triesRangeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Export Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExport}
                    className="w-full justify-start"
                  >
                    {selectedRows.length > 0 
                      ? `Export Selected (${selectedRows.length})` 
                      : `Export All (${filteredData.length})`
                    }
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredData.length} of {sampleAudienceData.length} results
            {activeFilterCount > 0 && (
              <span className="ml-2 text-blue-600">
                ({activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active)
              </span>
            )}
          </span>
          {selectedRows.length > 0 && (
            <span className="text-blue-600">
              {selectedRows.length} row{selectedRows.length !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {activeFilterCount > 0 
                      ? "No results match your current filters. Try adjusting your search criteria."
                      : "No audience data available."
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(item.id)}
                        onCheckedChange={() => handleRowSelect(item.id)}
                        aria-label={`Select ${item.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.phoneNumber}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell>{item.tries}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};