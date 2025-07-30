import React, { useCallback, useState, useRef, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../../components/ui/pagination";
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
import { ChevronDown, Square, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "../../../../components/ui/dropdown-menu";
import { Checkbox } from "../../../../components/ui/checkbox";
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Play, 
  Pause, 
  Upload, 
  Users, 
  Loader2,
  AlertTriangle,
  MoreVertical,
  Phone,
  PhoneOff,
  Edit,
  StopCircle
} from "lucide-react";

// Enhanced interfaces with better type safety
interface AudienceData {
  identifier: string;
  name: string;
  phone: string;
  createdAt: string;
  status: 'Pending' | 'Serviced' | 'Stopped' | 'Failed';
  tries: string;
  result: string;
}

interface ContactAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'call' | 'stop' | 'resume';
  color: string;
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
  suggestion?: string;
}

interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicatesRemoved: number;
  timestamp: string;
}

interface PhonebookList {
  id: string;
  name: string;
  contactCount: number;
}

// Enhanced Actions Menu Component with proper error handling and accessibility
interface ActionsMenuProps {
  contact: AudienceData;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCallContact: (contactName: string) => Promise<void>;
  onStopContact: (contact: AudienceData) => Promise<void>;
  onResumeContact: (contact: AudienceData) => Promise<void>;
  isActionInProgress: boolean;
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({
  contact,
  isOpen,
  onOpenChange,
  onCallContact,
  onStopContact,
  onResumeContact,
  isActionInProgress,
}) => {
  // Generate available actions based on contact status
  const getAvailableActions = (contact: AudienceData): ContactAction[] => {
    const baseActions: ContactAction[] = [
      {
        id: 'call',
        label: 'Call Contact',
        icon: Phone,
        variant: 'call',
        color: 'text-green-600',
      },
    ];

    if (contact.status === "Stopped") {
      baseActions.push({
        id: 'resume',
        label: 'Resume Contact',
        icon: Phone,
        variant: 'resume',
        color: 'text-green-600',
      });
    } else {
      baseActions.push({
        id: 'stop',
        label: 'Stop Contact',
        icon: StopCircle,
        variant: 'stop',
        color: 'text-red-600',
      });
    }

    return baseActions;
  };

  const availableActions = getAvailableActions(contact);

  // Enhanced action handler with proper error handling
  const handleActionClick = async (action: ContactAction, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isActionInProgress) {
      return; // Prevent multiple simultaneous actions
    }
    
    try {
      // Close dropdown immediately to prevent UI freezing
      onOpenChange(false);
      
      // Execute action based on variant
      switch (action.variant) {
        case 'call':
          await onCallContact(contact.name);
          break;
        case 'stop':
          await onStopContact(contact);
          break;
        case 'resume':
          await onResumeContact(contact);
          break;
        default:
          console.warn(`Unknown action variant: ${action.variant}`);
      }
    } catch (error) {
      console.error(`Error executing action ${action.variant}:`, error);
      toast.error(`Failed to ${action.variant} contact. Please try again.`);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onOpenChange]);

  return (
    <DropdownMenu 
      open={isOpen} 
      onOpenChange={onOpenChange}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-label={`Actions for ${contact.name}`}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          disabled={isActionInProgress}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {isActionInProgress ? (
            <Loader2 className="h-4 w-4 text-gray-500 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4 text-gray-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="min-w-[160px]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {availableActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <DropdownMenuItem
              key={action.id}
              onClick={(e) => handleActionClick(action, e)}
              className="flex items-center cursor-pointer hover:bg-gray-50 focus:bg-gray-50 transition-colors"
              role="menuitem"
              aria-label={`${action.label} for ${contact.name}`}
              disabled={isActionInProgress}
            >
              <IconComponent className={`h-4 w-4 mr-2 ${action.color}`} />
              <span className="text-sm">{action.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const AudienceTableSection = (): JSX.Element => {
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management with better organization
  const [isPlaying, setIsPlaying] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [importOption, setImportOption] = useState<'phonebook' | 'file' | null>(null);
  const [selectedPhonebooks, setSelectedPhonebooks] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [listName, setListName] = useState<string>('');
  const [listNameError, setListNameError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPhonebookDropdownOpen, setIsPhonebookDropdownOpen] = useState(false);
  
  // Actions dropdown state with better management
  const [openActionDropdown, setOpenActionDropdown] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [bulkActionInProgress, setBulkActionInProgress] = useState<string | null>(null);
  const [showBulkStopConfirm, setShowBulkStopConfirm] = useState(false);
  
  // Checklist column state management
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  
  // Data state
  const [audienceData, setAudienceData] = useState<AudienceData[]>([
    {
      identifier: "2e6f1",
      name: "tahani",
      phone: "962770535853",
      createdAt: "May 27, 2025 . 04:38 PM",
      status: "Serviced",
      tries: "1",
      result: "",
    },
    {
      identifier: "2e6f2", // Fixed: Made identifier unique
      name: "Noor",
      phone: "962799235768",
      createdAt: "May 27, 2025 . 02:29 PM",
      status: "Serviced",
      tries: "1",
      result: "",
    },
  ]);

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [validRows, setValidRows] = useState<AudienceData[]>([]);

  // Enhanced click outside handler for better UX
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Close any open dropdown when clicking outside
      if (openActionDropdown && !target?.closest('[data-radix-popper-content-wrapper]')) {
        setOpenActionDropdown(null);
      }
      
      // Close phonebook dropdown when clicking outside
      if (isPhonebookDropdownOpen && !target?.closest('.phonebook-dropdown-container')) {
        setIsPhonebookDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openActionDropdown, isPhonebookDropdownOpen]);

  // Enhanced keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (openActionDropdown) {
          setOpenActionDropdown(null);
        }
        if (isPhonebookDropdownOpen) {
          setIsPhonebookDropdownOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openActionDropdown, isPhonebookDropdownOpen]);

  // Enhanced contact action handlers with better error handling and optimistic updates
  const handleStopContact = useCallback(async (contact: AudienceData): Promise<void> => {
    if (actionInProgress === contact.identifier) return; // Prevent multiple simultaneous actions
    
    setActionInProgress(contact.identifier);
    const originalContact = { ...contact };
    
    try {
      // Optimistic update for immediate UI feedback
      const updatedContact: AudienceData = { ...contact, status: "Stopped" };
      
      setAudienceData(prevData => 
        prevData.map(item => 
          item.identifier === contact.identifier ? updatedContact : item
        )
      );
      
      // Simulate API call with proper error handling
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate occasional failures for testing
          if (Math.random() > 0.9) {
            reject(new Error('Network error'));
          } else {
            resolve(undefined);
          }
        }, 500);
      });
      
      toast.success(`Contact ${contact.name} has been stopped`);
    } catch (error) {
      // Revert optimistic update on error
      setAudienceData(prevData => 
        prevData.map(item => 
          item.identifier === contact.identifier ? originalContact : item
        )
      );
      
      console.error('Error updating contact status:', error);
      toast.error(`Failed to stop contact for ${contact.name}. Please try again.`);
      throw error; // Re-throw to handle in ActionsMenu
    } finally {
      setActionInProgress(null);
    }
  }, [actionInProgress]);

  const handleResumeContact = useCallback(async (contact: AudienceData): Promise<void> => {
    if (actionInProgress === contact.identifier) return; // Prevent multiple simultaneous actions
    
    setActionInProgress(contact.identifier);
    const originalContact = { ...contact };
    
    try {
      // Optimistic update for immediate UI feedback
      const updatedContact: AudienceData = { ...contact, status: "Pending" };
      
      setAudienceData(prevData => 
        prevData.map(item => 
          item.identifier === contact.identifier ? updatedContact : item
        )
      );
      
      // Simulate API call with proper error handling
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate occasional failures for testing
          if (Math.random() > 0.9) {
            reject(new Error('Network error'));
          } else {
            resolve(undefined);
          }
        }, 500);
      });
      
      toast.success(`Contact ${contact.name} has been resumed`);
    } catch (error) {
      // Revert optimistic update on error
      setAudienceData(prevData => 
        prevData.map(item => 
          item.identifier === contact.identifier ? originalContact : item
        )
      );
      
      console.error('Error updating contact status:', error);
      toast.error(`Failed to resume contact for ${contact.name}. Please try again.`);
      throw error; // Re-throw to handle in ActionsMenu
    } finally {
      setActionInProgress(null);
    }
  }, [actionInProgress]);

  // Enhanced call contact handler
  const handleCallContact = useCallback(async (contactName: string): Promise<void> => {
    try {
      // Simulate call initiation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      toast.success(`Calling ${contactName}...`);
      console.log(`Initiating call to ${contactName}`);
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error(`Failed to call ${contactName}. Please try again.`);
      throw error;
    }
  }, []);

  // Enhanced dropdown state management
  const handleActionDropdownChange = useCallback((identifier: string, open: boolean) => {
    if (actionInProgress === identifier) return; // Prevent opening dropdown during action
    setOpenActionDropdown(open ? identifier : null);
  }, [actionInProgress]);

  // Checklist handlers
  // Bulk action handlers
  const handleBulkStop = useCallback(async () => {
    if (selectedRows.size === 0) return;

    setBulkActionInProgress("stop");
    try {
      // Simulate API call to stop selected contacts
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the status of selected contacts to "Stopped"
      setAudienceData(prevData =>
        prevData.map(item =>
          selectedRows.has(item.identifier)
            ? { ...item, status: "Stopped" }
            : item
        )
      );
      
      // Clear selection and show success message
      setSelectedRows(new Set());
      setShowBulkStopConfirm(false);
      toast.success(`Successfully stopped ${selectedRows.size} contact(s)`);
    } catch (error) {
      console.error('Error stopping contacts:', error);
      toast.error('Failed to stop contacts. Please try again.');
    } finally {
      setBulkActionInProgress(null);
    }
  }, [selectedRows]);

  const handleBulkExport = useCallback(() => {
    if (selectedRows.size === 0) {
      toast.error('Please select contacts to export');
      return;
    }

    try {
      // Filter selected contacts
      const selectedContacts = audienceData.filter(contact => 
        selectedRows.has(contact.identifier)
      );

      // Prepare data for export
      const exportData = selectedContacts.map(contact => ({
        ID: contact.identifier,
        Name: contact.name,
        Phone: contact.phone,
        'Created At': contact.createdAt,
        Status: contact.status,
        'Number of Tries': contact.tries,
        Result: contact.result
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Selected Contacts');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `selected-contacts-${timestamp}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      toast.success(`Exported ${selectedContacts.length} contacts successfully`);
    } catch (error) {
      console.error('Error exporting contacts:', error);
      toast.error('Failed to export contacts. Please try again.');
    }
  }, [selectedRows, audienceData]);

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === audienceData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(audienceData.map(row => row.identifier)));
    }
  }, [selectedRows.size, audienceData]);

  const handleRowSelect = useCallback((identifier: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(identifier)) {
        newSet.delete(identifier);
      } else {
        newSet.add(identifier);
      }
      return newSet;
    });
  }, []);

  const isAllSelected = selectedRows.size === audienceData.length && audienceData.length > 0;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < audienceData.length;

  // Mock phonebook data
  const phonebookLists: PhonebookList[] = [
    { id: '1', name: 'Customer Database', contactCount: 1250 },
    { id: '2', name: 'Sales Prospects', contactCount: 890 },
    { id: '3', name: 'Support Contacts', contactCount: 456 },
    { id: '4', name: 'VIP Clients', contactCount: 78 },
    { id: '5', name: 'Marketing List', contactCount: 2340 },
  ];

  // Memoized stats cards to prevent unnecessary re-renders
  const statsCards = React.useMemo(() => [
    { title: "Audience Count", value: audienceData.length.toString() },
    { title: "Serviced Calls", value: audienceData.filter(item => item.status === 'Serviced').length.toString() },
    { title: "Failed Calls", value: audienceData.filter(item => item.status === 'Failed').length.toString() },
    { title: "Response Rate", value: audienceData.length > 0 ? `${((audienceData.filter(item => item.status === 'Serviced').length / audienceData.length) * 100).toFixed(1)}%` : "0.0%" },
  ], [audienceData]);

  // Enhanced validation functions with better error handling
  const validatePhoneNumber = useCallback((phone: unknown): boolean => {
    if (!phone || typeof phone !== 'string') return false;
    const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    // Must be between 10-15 digits (with or without + prefix)
    const phoneRegex = /^(\+?\d{10,15})$/;
    return phoneRegex.test(cleanPhone);
  }, []);

  const validateName = useCallback((name: unknown): boolean => {
    if (!name || typeof name !== 'string') return false;
    const trimmedName = name.trim();
    return trimmedName.length > 0 && trimmedName.length <= 100;
  }, []);

  const validateHeaders = useCallback((headers: unknown[]): boolean => {
    if (!Array.isArray(headers) || headers.length !== 2) return false;
    const normalizedHeaders = headers.map(h => String(h).toLowerCase().trim());
    return normalizedHeaders.includes('name') && normalizedHeaders.includes('phone');
  }, []);

  const validateListName = useCallback((name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Please enter a list name';
    }
    if (trimmed.length < 2) {
      return 'List name must be at least 2 characters';
    }
    if (trimmed.length > 50) {
      return 'List name must be 50 characters or less';
    }
    return '';
  }, []);

  const standardizePhoneNumber = useCallback((phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    
    // If already starts with 962, keep as is
    if (digits.startsWith('962')) {
      return digits;
    }
    
    // If starts with 0, replace with 962
    if (digits.startsWith('0')) {
      return `962${digits.substring(1)}`;
    }
    
    // Otherwise, assume it's a local number and add 962
    return `962${digits}`;
  }, []);

  const standardizeCreatedAt = useCallback((date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');
    
    return `${month} ${day}, ${year} . ${formattedHours}:${minutes} ${period}`;
  }, []);

  const getErrorSuggestion = useCallback((field: string, value: string, error: string): string => {
    if (field === 'phone') {
      if (error.includes('required')) {
        return 'Provide a valid phone number';
      }
      if (error.includes('format')) {
        return 'Use format: +962771234567 or 0771234567 (10-15 digits)';
      }
    }
    if (field === 'name') {
      if (error.includes('required')) {
        return 'Enter a contact name (1-100 characters)';
      }
      if (error.includes('long')) {
        return 'Name must be 100 characters or less';
      }
    }
    return 'Please correct this field according to the requirements';
  }, []);

  // Enhanced state reset function
  const resetImportState = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setValidationErrors([]);
    setValidRows([]);
    setImportSummary(null);
    setImportOption(null);
    setSelectedPhonebooks([]);
    setSelectedFile(null);
    setListName('');
    setListNameError('');
    setIsLoading(false);
    setIsDragOver(false);
    setIsPhonebookDropdownOpen(false);
    setShowErrorModal(false);
  }, []);

  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Enhanced drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Validate file type before setting
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (allowedTypes.includes(file.type) || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        setSelectedFile(file);
        // Validate list name when file is dropped
        if (!listName.trim()) {
          setListNameError('Please enter a list name');
        }
      } else {
        toast.error('Please upload a CSV or Excel file');
      }
    }
  }, [listName]);

  const handleListNameChange = useCallback((value: string) => {
    setListName(value);
    // Clear error when user starts typing
    if (listNameError && value.trim()) {
      setListNameError('');
    }
    // Validate in real-time
    const error = validateListName(value);
    setListNameError(error);
  }, [listNameError, validateListName]);

  const downloadSampleFile = useCallback(() => {
    try {
      // Create sample data based on the attached CSV
      const sampleData = [
        ['Name', 'Phone number'],
        ['Fouad', '97123456789'],
        ['David', '97123344567'],
        ['Ali', '96623344555'],
        ['John', '+12345678910']
      ];

      // Convert to CSV format
      const csvContent = sampleData.map(row => row.join(',')).join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', 'Contacts Sample.csv');
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
      
      toast.success('Sample file downloaded successfully');
    } catch (error) {
      console.error('Error downloading sample file:', error);
      toast.error('Failed to download sample file');
    }
  }, []);

  // Enhanced file processing with better error handling
  const processFile = useCallback((file: File) => {
    console.log('Processing file:', file.name);
    
    // Enhanced file validation
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) {
        toast.error('Failed to read file');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Reading file data...');
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        console.log('Raw data:', rawData);
        
        if (rawData.length < 2) {
          toast.error('File is empty or contains no data rows');
          setIsLoading(false);
          return;
        }

        const headers = rawData[0];
        console.log('Headers:', headers);
        
        if (!validateHeaders(headers)) {
          toast.error('Invalid headers. File must contain exactly two columns named "name" and "phone"');
          setIsLoading(false);
          return;
        }

        // Reset previous validation results
        setValidationErrors([]);
        setValidRows([]);
        
        const errors: ValidationError[] = [];
        const valid: AudienceData[] = [];
        const dataRows = rawData.slice(1); // Skip header row

        console.log('Processing', dataRows.length, 'data rows...');

        // Track duplicates by phone number and name combination
        const seenContacts = new Map<string, number>();
        let duplicatesCount = 0;

        // Process each data row
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const rowNumber = i + 2; // +2 because we start from row 2 (after header)
          
          // Skip completely empty rows
          if (!row || (Array.isArray(row) && row.every(cell => !cell || String(cell).trim() === ''))) {
            continue;
          }

          console.log(`Processing row ${rowNumber}:`, row);

          const [nameValue, phoneValue] = row;
          let hasRowError = false;
          
          // Check for duplicates (normalize phone and name for comparison)
          if (nameValue && phoneValue) {
            const normalizedPhone = standardizePhoneNumber(String(phoneValue));
            const normalizedName = String(nameValue).trim().toLowerCase();
            const contactKey = `${normalizedName}|${normalizedPhone}`;
            
            if (seenContacts.has(contactKey)) {
              // This is a duplicate - skip it entirely and count it
              duplicatesCount++;
              continue; // Skip processing this duplicate row
            } else {
              seenContacts.set(contactKey, rowNumber);
            }
          }

          // Validate name
          if (!validateName(nameValue)) {
            const error = !nameValue || String(nameValue).trim() === '' 
              ? 'Name is required' 
              : String(nameValue).length > 100 
                ? 'Name is too long (max 100 characters)'
                : 'Invalid name format';
            
            errors.push({
              row: rowNumber,
              field: 'name',
              value: nameValue ? String(nameValue) : '(empty)',
              error,
              suggestion: getErrorSuggestion('name', nameValue ? String(nameValue) : '', error)
            });
            hasRowError = true;
          }

          // Validate phone
          if (!validatePhoneNumber(phoneValue)) {
            const error = !phoneValue || String(phoneValue).trim() === ''
              ? 'Phone number is required'
              : 'Phone number must be in valid format (10-15 digits)';
            
            errors.push({
              row: rowNumber,
              field: 'phone',
              value: phoneValue ? String(phoneValue) : '(empty)',
              error,
              suggestion: getErrorSuggestion('phone', phoneValue ? String(phoneValue) : '', error)
            });
            hasRowError = true;
          }

          // If no errors, add to valid rows
          if (!hasRowError) {
            valid.push({
              identifier: Math.random().toString(36).substr(2, 5),
              name: String(nameValue).trim(),
              phone: standardizePhoneNumber(String(phoneValue)),
              createdAt: standardizeCreatedAt(new Date()),
              status: "Pending",
              tries: "0",
              result: "",
            });
          }
        }

        console.log('Validation complete. Errors:', errors.length, 'Valid:', valid.length);

        if (errors.length > 0) {
          // Log errors for debugging but proceed with valid rows only
          console.log('Import validation found', errors.length, 'errors:', errors);
          console.log('Proceeding with', valid.length, 'valid contacts');
          
          // Import only valid rows without showing error modal
          if (valid.length > 0) {
            setAudienceData(prev => [...prev, ...valid]);
            
            const duplicateMessage = duplicatesCount > 0 ? ` (${duplicatesCount} duplicates removed)` : '';
            const errorMessage = errors.length > 0 ? ` (${errors.length} invalid rows skipped)` : '';
            toast.success(`Successfully imported ${valid.length} contacts${duplicateMessage}${errorMessage}`);
          } else {
            toast.error('No valid contacts found to import. Please check your file format.');
          }
          
          // Close modal and reset state
          setIsLoading(false);
          setShowImportModal(false);
          resetImportState();
        } else {
          // All rows are valid - import directly
          setIsLoading(false);
          
          setAudienceData(prev => [...prev, ...valid]);
          
          // Force close modal and reset all state
          setShowImportModal(false);
          resetImportState();
          
          // Show success message after state is reset
          const duplicateMessage = duplicatesCount > 0 ? ` (${duplicatesCount} duplicates removed)` : '';
          toast.success(`Successfully imported ${valid.length} contacts${duplicateMessage}`);
        }
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error('Error processing file. Please check the file format.');
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      toast.error('Error reading file');
      setIsLoading(false);
    };

    reader.readAsBinaryString(file);
  }, [validateHeaders, validateName, validatePhoneNumber, standardizePhoneNumber, standardizeCreatedAt, getErrorSuggestion, resetImportState]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
  }, []);

  const handlePhonebookToggle = useCallback((phonebookId: string) => {
    setSelectedPhonebooks(prev => 
      prev.includes(phonebookId)
        ? prev.filter(id => id !== phonebookId)
        : [...prev, phonebookId]
    );
  }, []);

  const handleSelectAllPhonebooks = useCallback(() => {
    if (selectedPhonebooks.length === phonebookLists.length) {
      setSelectedPhonebooks([]);
    } else {
      setSelectedPhonebooks(phonebookLists.map(list => list.id));
    }
  }, [selectedPhonebooks.length, phonebookLists]);

  const togglePhonebookDropdown = useCallback(() => {
    setIsPhonebookDropdownOpen(!isPhonebookDropdownOpen);
  }, [isPhonebookDropdownOpen]);

  const getSelectedPhonebooksText = useCallback(() => {
    if (selectedPhonebooks.length === 0) {
      return 'Select phonebook lists';
    }
    if (selectedPhonebooks.length === 1) {
      const selectedList = phonebookLists.find(list => list.id === selectedPhonebooks[0]);
      return selectedList?.name || 'Selected list';
    }
    return `${selectedPhonebooks.length} lists selected`;
  }, [selectedPhonebooks, phonebookLists]);

  const handlePhonebookImport = useCallback(async () => {
    if (selectedPhonebooks.length === 0) {
      toast.error('Please select at least one phonebook list');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call with proper error handling
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate occasional failures
          if (Math.random() > 0.95) {
            reject(new Error('Import failed'));
          } else {
            resolve(undefined);
          }
        }, 2000);
      });

      const selectedLists = phonebookLists.filter(list => selectedPhonebooks.includes(list.id));
      let totalImported = 0;
      const allMockData: AudienceData[] = [];
      
      selectedLists.forEach((list) => {
        const contactsToImport = Math.min(list.contactCount, 5); // Limit for demo
        const mockData: AudienceData[] = Array.from({ length: contactsToImport }, (_, i) => ({
          identifier: Math.random().toString(36).substr(2, 5),
          name: `${list.name} Contact ${i + 1}`,
          phone: `96277${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
          createdAt: standardizeCreatedAt(new Date()),
          status: "Pending",
          tries: "0",
          result: "",
        }));
        
        allMockData.push(...mockData);
        totalImported += contactsToImport;
      });

      setAudienceData(prev => [...prev, ...allMockData]);
      const listNames = selectedLists.map(list => list.name).join(', ');
      toast.success(`Successfully imported ${totalImported} contacts from ${selectedLists.length} list(s): ${listNames}`);
      setShowImportModal(false);
      resetImportState();
    } catch (error) {
      console.error('Error importing from phonebook:', error);
      toast.error('Failed to import from phonebook. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedPhonebooks, phonebookLists, standardizeCreatedAt, resetImportState]);

  const handleImportConfirm = useCallback(() => {
    if (validRows.length > 0) {
      const duplicateMessage = importSummary?.duplicatesRemoved && importSummary.duplicatesRemoved > 0 
        ? ` (${importSummary.duplicatesRemoved} duplicates removed)` 
        : '';
      setAudienceData(prev => [...prev, ...validRows]);
      toast.success(`Successfully imported ${validRows.length} contacts${duplicateMessage}`);
    }
    setShowErrorModal(false);
    setShowImportModal(false);
    resetImportState();
  }, [validRows, importSummary, resetImportState]);

  const handlePlayPauseToggle = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleFileImport = useCallback(() => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }
    
    console.log('Starting file import for:', selectedFile.name);
    processFile(selectedFile);
  }, [selectedFile, processFile]);

  const canProceedWithFileUpload = useCallback(() => {
    return selectedFile !== null;
  }, [selectedFile]);

  const handleEditCampaign = useCallback(() => {
    // Placeholder function for edit campaign functionality
    toast.success('Edit Campaign clicked');
    console.log('Edit Campaign button clicked');
  }, []);

  return (
    <section className="w-full bg-neutral-100 p-6">
      <div className="w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium">DirectToNoor</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-8 text-xs gap-2"
              onClick={handleEditCampaign}
            >
              <Edit className="h-3.5 w-3.5" />
              Edit Campaign
            </Button>

            <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-8 text-xs gap-2">
                  <div className="w-3.5 h-3.5 bg-[url(/frame-19.svg)] bg-[100%_100%]" />
                  Import Audience
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader className="relative pb-2 pt-2">
                  <DialogTitle className="text-lg font-semibold pr-12 mt-2">Import Audience</DialogTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Start adding contacts to the <span className="font-medium text-gray-800">DirectToNoor</span> campaign
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-0 h-8 w-8 p-0 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-10"
                    onClick={() => {
                      setShowImportModal(false);
                      resetImportState();
                    }}
                  >
                    <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                  </Button>
                </DialogHeader>
                
                <div className="mt-4">
                  {/* Import Option Selection */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Choose Import Method
                      </label>
                      <Select value={importOption || ''} onValueChange={(value) => setImportOption(value as 'phonebook' | 'file')}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select how you want to import contacts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phonebook">Import List from Phonebook</SelectItem>
                          <SelectItem value="file">Upload file</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Phonebook Import Section */}
                    {importOption === 'phonebook' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Phonebook Lists
                        </label>
                        
                        <div className="relative phonebook-dropdown-container">
                          {/* Dropdown Trigger */}
                          <button
                            type="button"
                            onClick={togglePhonebookDropdown}
                            className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm text-gray-700 truncate">
                                {getSelectedPhonebooksText()}
                              </span>
                              {selectedPhonebooks.length > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                                  {selectedPhonebooks.length}
                                </span>
                              )}
                            </div>
                            <div className={`transform transition-transform duration-200 ${isPhonebookDropdownOpen ? 'rotate-180' : ''}`}>
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>

                          {/* Dropdown Content */}
                          {isPhonebookDropdownOpen && (
                            <>
                              {/* Backdrop */}
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setIsPhonebookDropdownOpen(false)}
                              />
                              
                              {/* Dropdown Panel */}
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                                {/* Header with Select All */}
                                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                                  <span className="text-sm font-medium text-gray-700">
                                    {selectedPhonebooks.length} of {phonebookLists.length} selected
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSelectAllPhonebooks}
                                    className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    {selectedPhonebooks.length === phonebookLists.length ? 'Deselect All' : 'Select All'}
                                  </Button>
                                </div>
                                
                                {/* Scrollable List */}
                                <div className="max-h-48 overflow-y-auto">
                                  {phonebookLists.map((list) => (
                                    <div
                                      key={list.id}
                                      className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                                      onClick={() => handlePhonebookToggle(list.id)}
                                    >
                                      <Checkbox
                                        id={`phonebook-${list.id}`}
                                        checked={selectedPhonebooks.includes(list.id)}
                                        onCheckedChange={() => handlePhonebookToggle(list.id)}
                                        className="flex-shrink-0"
                                      />
                                      <label
                                        htmlFor={`phonebook-${list.id}`}
                                        className="flex-1 text-sm text-gray-700 cursor-pointer"
                                      >
                                        <div className="font-medium">{list.name}</div>
                                        <div className="text-xs text-gray-500">{list.contactCount} contacts</div>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* File Upload Section */}
                    {importOption === 'file' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload File <span className="text-red-500">*</span>
                          </label>
                          
                          {/* Selected File Display */}
                          {selectedFile && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  <FileText className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-700">
                                    {selectedFile.name}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={clearSelectedFile}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-green-600 mt-1 ml-7">
                                File ready for upload
                              </p>
                            </div>
                          )}

                          {/* Upload and Download Buttons */}
                          <div className="flex gap-3">
                            {/* Upload Button */}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              className={`flex-1 h-10 border-2 border-dashed transition-colors ${
                                isDragOver 
                                  ? 'border-blue-400 bg-blue-50' 
                                  : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
                              }`}
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                            >
                              <Upload className="h-4 w-4 mr-2 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                {selectedFile ? 'Change File' : 'Choose File or Drag & Drop'}
                              </span>
                            </Button>

                            {/* Download Sample Button */}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={downloadSampleFile}
                              className="px-4 h-10 border border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-colors"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Sample
                            </Button>

                            {/* Hidden File Input */}
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".csv,.xlsx,.xls"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </div>

                          {/* Upload Instructions Footer */}
                          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">File Upload Guidelines</h4>
                            <ul className="text-xs text-gray-600 space-y-1">
                              <li className="flex items-start gap-2">
                                <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                <span><strong>Maximum file size:</strong> 10 MB</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                <span><strong>Accepted formats:</strong> XLSX, XLS, and CSV files</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                <span><strong>Number format:</strong> Must follow international number format standards (e.g., +962771234567) or the country code without (+)</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom buttons section */}
                  <div className="flex justify-end items-center gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowImportModal(false);
                        resetImportState();
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    
                    {importOption === 'phonebook' && (
                      <Button 
                        onClick={handlePhonebookImport}
                        disabled={selectedPhonebooks.length === 0 || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          `Import (${selectedPhonebooks.length})`
                        )}
                      </Button>
                    )}

                    {importOption === 'file' && (
                      <Button 
                        onClick={handleFileImport}
                        disabled={!canProceedWithFileUpload() || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Upload & Import'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Enhanced Error Modal */}
            <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0 pb-4 border-b relative">
                  <DialogTitle className="text-lg font-semibold flex items-center gap-2 pr-12">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Import Validation Results
                  </DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-0 right-0 h-8 w-8 p-0 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-10"
                    onClick={() => setShowErrorModal(false)}
                  >
                    <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                  </Button>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Summary Section */}
                  {importSummary && (
                    <div className="flex-shrink-0 mb-6">
                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{importSummary.totalRows}</div>
                          <div className="text-sm text-blue-700 font-medium">Total Contacts</div>
                          <div className="text-xs text-blue-600 mt-1">Processed</div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{importSummary.validRows}</div>
                          <div className="text-sm text-green-700 font-medium">Valid Contacts</div>
                          <div className="text-xs text-green-600 mt-1">Ready to import</div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">{importSummary.invalidRows}</div>
                          <div className="text-sm text-red-700 font-medium">Invalid Contacts</div>
                          <div className="text-xs text-red-600 mt-1">Need correction</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-orange-600">{importSummary.duplicatesRemoved}</div>
                          <div className="text-sm text-orange-700 font-medium">Duplicates Removed</div>
                          <div className="text-xs text-orange-600 mt-1">Automatically filtered</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Details Section */}
                  {validationErrors.length > 0 && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                      <div className="flex-shrink-0 mb-3">
                        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          Validation Errors ({validationErrors.length})
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          The following rows contain errors that need to be corrected:
                        </p>
                      </div>

                      <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
                        <div className="divide-y divide-gray-100">
                          {validationErrors.map((error, index) => (
                            <div key={index} className="p-4 hover:bg-gray-50">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium text-red-600">
                                    {error.row}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-900">
                                      Row {error.row}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                      {error.field}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 mb-1">
                                    <span className="font-medium">Value:</span> "{error.value || '(empty)'}"
                                  </div>
                                  <div className="text-sm text-red-600 mb-2">
                                    <span className="font-medium">Error:</span> {error.error}
                                  </div>
                                  {error.suggestion && (
                                    <div className="text-sm text-blue-600 bg-blue-50 rounded px-2 py-1">
                                      <span className="font-medium">Suggestion:</span> {error.suggestion}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex-shrink-0 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {validRows.length > 0 && (
                        <span>Proceeding with {validRows.length} of {importSummary?.totalRows} contacts</span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowErrorModal(false);
                          setShowImportModal(true);
                        }}
                      >
                        Cancel Upload
                      </Button>
                      <Button
                        onClick={handleImportConfirm}
                        disabled={validRows.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Proceed with Valid Contacts ({validRows.length})
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant={isPlaying ? "destructive" : "default"}
              className={`h-8 text-xs gap-2 transition-colors duration-200 ${
                isPlaying ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={handlePlayPauseToggle}
            >
              {isPlaying ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {isPlaying ? "Pause" : "Run"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {statsCards.map((card, index) => (
            <Card key={index} className="border border-[#f0f0f0]">
              <CardContent className="p-6 flex flex-col items-center">
                <p className="text-2xl font-medium text-[#000000e0] mt-2">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 mt-2">{card.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Audience Table */}
        <Card className="border">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="font-medium">Audience</h3>
              
              {/* Bulk Actions Button - positioned next to title */}
              {selectedRows.size > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                    {selectedRows.size} selected
                  </span>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={bulkActionInProgress}
                        className="bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
                      >
                        {bulkActionInProgress ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Bulk actions
                            <div className="w-4 h-4 ml-2 bg-[url(/frame-9.svg)] bg-[100%_100%] filter invert" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem
                        onClick={handleBulkExport}
                        disabled={bulkActionInProgress}
                       
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"

                      >
                       <Download className="w-4 h-4" />
                        Export Contacts
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowBulkStopConfirm(true)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-red-600"                      >
                         <StopCircle className="w-4 h-4" />
                        Stop Contacts
                       
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
            
           
            
            <Button variant="outline" className="h-8 text-xs gap-2">
              <div className="w-3.5 h-3.5 bg-[url(/frame-8.svg)] bg-[100%_100%]" />
              Export
            </Button>
          </div>

          <Table>
            <TableHeader className="bg-neutral-50">
              <TableRow>
                <TableHead className="font-semibold text-xs text-[#000000e0] w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all rows"
                    className="mx-auto"
                    {...(isIndeterminate && { 'data-state': 'indeterminate' })}
                  />
                </TableHead>
                <TableHead className="font-semibold text-xs text-[#000000e0]">
                  ID
                </TableHead>
                <TableHead className="font-semibold text-xs text-[#000000e0]">
                  Name
                </TableHead>
                <TableHead className="font-semibold text-xs text-[#000000e0]">
                  Phone
                </TableHead>
                <TableHead className="font-semibold text-xs text-[#000000e0]">
                  Created at
                </TableHead>
                <TableHead className="font-semibold text-xs text-[#000000e0]">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-xs text-[#000000e0]">
                  Number of Tries
                </TableHead>
                <TableHead className="font-semibold text-xs text-[#000000e0]">
                  Result
                </TableHead>
                <TableHead className="font-semibold text-xs text-[#000000e0]">
                  Call Logs
                </TableHead>
                <TableHead className="font-semibold text-xs text-[#000000e0]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audienceData.map((row, index) => (
                <TableRow key={`${row.identifier}-${index}`}>
                  <TableCell className="text-xs text-[#000000e0] w-12">
                    <Checkbox
                      checked={selectedRows.has(row.identifier)}
                      onCheckedChange={() => handleRowSelect(row.identifier)}
                      aria-label={`Select row for ${row.name}`}
                      className="mx-auto"
                    />
                  </TableCell>
                  <TableCell className="text-xs text-[#000000e0]">
                    {row.identifier}
                  </TableCell>
                  <TableCell className="text-xs text-[#000000e0]">
                    {row.name}
                  </TableCell>
                  <TableCell className="text-xs text-[#000000e0]">
                    {row.phone}
                  </TableCell>
                  <TableCell className="text-xs text-[#000000e0]">
                    {row.createdAt}
                  </TableCell>
                  <TableCell className="text-xs text-[#000000e0]">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      row.status === 'Serviced' ? 'bg-green-100 text-green-800' :
                      row.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      row.status === 'Stopped' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {row.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-[#000000e0]">
                    {row.tries}
                  </TableCell>
                  <TableCell className="text-xs text-[#000000e0]">
                    {row.result}
                  </TableCell>
                  <TableCell className="text-xs text-[#000000e0]">
                    <a 
                      href="#" 
                      className="text-blue-600 underline hover:text-blue-800 cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.success(`Viewing call logs for ${row.name}`);
                      }}
                    >
                      View Calls
                    </a>
                  </TableCell>
                  <TableCell className="text-xs text-[#000000e0]">
                    <ActionsMenu
                      contact={row}
                      isOpen={openActionDropdown === row.identifier}
                      onOpenChange={(open) => handleActionDropdownChange(row.identifier, open)}
                      onCallContact={handleCallContact}
                      onStopContact={handleStopContact}
                      onResumeContact={handleResumeContact}
                      isActionInProgress={actionInProgress === row.identifier}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-end items-center p-2 border-t">
            <div className="flex items-center gap-4">
              <span className="text-xs text-[#000000e0]">
                • Showing 1-{audienceData.length} of {audienceData.length} items
              </span>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious className="h-8 w-8 p-0" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink className="h-8 w-8 p-0" isActive>
                      1
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext className="h-8 w-8 p-0" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <Select defaultValue="10">
                <SelectTrigger className="w-[101px] h-8">
                  <SelectValue placeholder="10 / page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Bulk Stop Confirmation Dialog */}
        <Dialog open={showBulkStopConfirm} onOpenChange={setShowBulkStopConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Bulk Stop
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to stop <span className="font-semibold text-gray-900">{selectedRows.size}</span> selected contacts?
              </p>
              <p className="text-xs text-gray-500">
                This action will change the status of all selected contacts to "Stopped" and they will no longer be processed in the campaign.
              </p>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowBulkStopConfirm(false)}
                disabled={bulkActionInProgress === 'stop'}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkStop}
                disabled={bulkActionInProgress === 'stop'}
                className="bg-red-600 hover:bg-red-700"
              >
                {bulkActionInProgress === 'stop' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop Contacts
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};