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
  Upload,
  X,
  Search,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

// Types for audience data
interface AudienceRecord {
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

// Mock data for demonstration
const mockAudienceData: AudienceRecord[] = [
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
  const [audienceData, setAudienceData] = useState<AudienceRecord[]>(mockAudienceData);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    phoneNumber: "",
    triesRange: "all",
  });

  const itemsPerPage = 10;

  // Debounced phone number filter
  const [phoneNumberInput, setPhoneNumberInput] = useState("");
  const [phoneNumberDebounceTimer, setPhoneNumberDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handlePhoneNumberChange = useCallback((value: string) => {
    setPhoneNumberInput(value);
    
    if (phoneNumberDebounceTimer) {
      clearTimeout(phoneNumberDebounceTimer);
    }

    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, phoneNumber: value }));
      setCurrentPage(1);
    }, 300);

    setPhoneNumberDebounceTimer(timer);
  }, [phoneNumberDebounceTimer]);

  // Filter logic
  const filteredData = useMemo(() => {
    return audienceData.filter((record) => {
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(record.status)) {
        return false;
      }

      // Phone number filter
      if (filters.phoneNumber && !record.phoneNumber.toLowerCase().includes(filters.phoneNumber.toLowerCase())) {
        return false;
      }

      // Tries range filter
      if (filters.triesRange !== "all") {
        if (filters.triesRange === "0" && record.tries !== 0) return false;
        if (filters.triesRange === "1-3" && (record.tries < 1 || record.tries > 3)) return false;
        if (filters.triesRange === "4-10" && (record.tries < 4 || record.tries > 10)) return false;
        if (filters.triesRange === "10+" && record.tries <= 10) return false;
      }

      return true;
    });
  }, [audienceData, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.phoneNumber) count++;
    if (filters.triesRange !== "all") count++;
    return count;
  }, [filters]);

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      status: [],
      phoneNumber: "",
      triesRange: "all",
    });
    setPhoneNumberInput("");
    setCurrentPage(1);
    toast.success("All filters cleared");
  };

  // Status filter handlers
  const handleStatusChange = (status: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      status: checked
        ? [...prev.status, status]
        : prev.status.filter(s => s !== status)
    }));
    setCurrentPage(1);
  };

  // Tries range filter handler
  const handleTriesRangeChange = (value: string) => {
    setFilters(prev => ({ ...prev, triesRange: value }));
    setCurrentPage(1);
  };

  // Row selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(paginatedData.map(record => record.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRows(newSelected);
  };

  // Import CSV functionality
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const newRecords: AudienceRecord[] = jsonData.map((row, index) => ({
          id: `imported-${Date.now()}-${index}`,
          name: row.Name || row.name || `Contact ${index + 1}`,
          phoneNumber: row["Phone number"] || row.phone || row.phoneNumber || "",
          status: "Queued" as const,
          tries: 0,
        }));

        setAudienceData(prev => [...prev, ...newRecords]);
        setIsImportDialogOpen(false);
        toast.success(`Imported ${newRecords.length} contacts successfully`);
      } catch (error) {
        toast.error("Error importing file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Export functionality
  const handleExport = () => {
    const dataToExport = selectedRows.size > 0
      ? audienceData.filter(record => selectedRows.has(record.id))
      : filteredData;

    const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(record => ({
      Name: record.name,
      "Phone Number": record.phoneNumber,
      Status: record.status,
      Tries: record.tries,
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audience");
    XLSX.writeFile(workbook, "audience-export.xlsx");
    
    toast.success(`Exported ${dataToExport.length} records`);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Audience Management</CardTitle>
          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="relative"
                  aria-label="Filter audience data"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Filters</h3>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-auto p-1 text-xs"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <div className="space-y-2">
                      {statusOptions.map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={filters.status.includes(status)}
                            onCheckedChange={(checked) =>
                              handleStatusChange(status, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`status-${status}`}
                            className="text-sm cursor-pointer"
                          >
                            {status}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phone Number Filter */}
                  <div className="space-y-2">
                    <label htmlFor="phone-filter" className="text-sm font-medium">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        id="phone-filter"
                        type="text"
                        placeholder="Search phone numbers..."
                        value={phoneNumberInput}
                        onChange={(e) => handlePhoneNumberChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        aria-label="Filter by phone number"
                      />
                      {phoneNumberInput && (
                        <button
                          onClick={() => handlePhoneNumberChange("")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label="Clear phone number filter"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tries Range Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Number of Tries</label>
                    <Select value={filters.triesRange} onValueChange={handleTriesRangeChange}>
                      <SelectTrigger className="w-full">
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
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Import Button */}
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Contacts</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Upload a CSV file with columns: Name, Phone number
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </DialogContent>
            </Dialog>

            {/* Export Button */}
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {paginatedData.length} of {filteredData.length} results
            {filteredData.length !== audienceData.length && (
              <span className="text-blue-600 ml-1">
                (filtered from {audienceData.length} total)
              </span>
            )}
          </span>
          {selectedRows.size > 0 && (
            <span className="text-blue-600">
              {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected
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
                    checked={
                      paginatedData.length > 0 &&
                      paginatedData.every(record => selectedRows.has(record.id))
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tries</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {activeFilterCount > 0 ? "No results match your filters" : "No data available"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(record.id)}
                        onCheckedChange={(checked) =>
                          handleSelectRow(record.id, checked as boolean)
                        }
                        aria-label={`Select ${record.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell>{record.phoneNumber}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === "Serviced"
                            ? "bg-green-100 text-green-800"
                            : record.status === "Trying"
                            ? "bg-blue-100 text-blue-800"
                            : record.status === "Queued"
                            ? "bg-yellow-100 text-yellow-800"
                            : record.status === "Maxed"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {record.status}
                      </span>
                    </TableCell>
                    <TableCell>{record.tries}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};