import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Link,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Toolbar,
  Divider,
  Chip,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  TableSortLabel,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar
} from '@mui/material';
import {
  Download,
  PictureAsPdf,
  Refresh,
  Dns,
  Visibility,
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  Fullscreen,
  Close,
  NavigateBefore,
  NavigateNext,
  Search,
  DarkMode,
  LightMode,
  Storage,
  Computer,
  Today,
  MoreVert,
  GetApp,
  Delete,
  FileDownload,
  WifiOff,
  Wifi,
  NotificationsActive,
  WarningAmber
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Interface and Type definitions (unchanged)
interface Invoice {
  id: number;
  originalFilename: string;
  savedFilename: string;
  fileSize: number;
  ipAddress: string;
  createdAt: string;
}
type SortField = 'originalFilename' | 'fileSize' | 'ipAddress' | 'createdAt';
type SortOrder = 'asc' | 'desc';
enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

// --- NEW --- Confirmation Dialog Component
const DeleteConfirmationDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemCount: number;
}> = ({ open, onClose, onConfirm, itemCount }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <WarningAmber color="error" />
      Confirm Deletion
    </DialogTitle>
    <DialogContent>
      <Typography>
        Are you sure you want to permanently delete {itemCount} file(s)? This action cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onConfirm} color="error" variant="contained">
        Delete
      </Button>
    </DialogActions>
  </Dialog>
);


// Statistics and PDFViewer Components (unchanged)
const StatisticsCards: React.FC<{ invoices: Invoice[] }> = ({ invoices }) => {
  const stats = useMemo(() => {
    const totalSize = invoices.reduce((sum, inv) => sum + inv.fileSize, 0);
    const today = new Date().toDateString();
    const todayUploads = invoices.filter(inv => new Date(inv.createdAt).toDateString() === today).length;
    const uniqueIPs = new Set(invoices.map(inv => inv.ipAddress)).size;
    
    return {
      totalFiles: invoices.length,
      totalSize: totalSize,
      todayUploads,
      uniqueIPs
    };
  }, [invoices]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {/*@ts-ignore */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PictureAsPdf sx={{ fontSize: 40, color: 'error.main' }} />
            <Box>
              <Typography variant="h4" component="div">{stats.totalFiles}</Typography>
              <Typography color="text.secondary">Total Files</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      {/*@ts-ignore */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Storage sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="div">{formatFileSize(stats.totalSize)}</Typography>
              <Typography color="text.secondary">Total Size</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      {/*@ts-ignore */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Today sx={{ fontSize: 40, color: 'success.main' }} />
            <Box>
              <Typography variant="h4" component="div">{stats.todayUploads}</Typography>
              <Typography color="text.secondary">Today's Uploads</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      {/*@ts-ignore */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Computer sx={{ fontSize: 40, color: 'warning.main' }} />
            <Box>
              <Typography variant="h4" component="div">{stats.uniqueIPs}</Typography>
              <Typography color="text.secondary">Unique IPs</Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
const PDFViewer: React.FC<{
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  filename: string;
}> = ({ open, onClose, pdfUrl, filename }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotateLeft = () => setRotation(prev => (prev - 90) % 360);
  const handleRotateRight = () => setRotation(prev => (prev + 90) % 360);
  const handleFullscreen = () => {
    const iframe = document.getElementById('pdf-iframe') as HTMLIFrameElement;
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  const resetControls = () => {
    setZoom(1);
    setRotation(0);
    setCurrentPage(1);
    setIsLoading(true);
    setError(null);
  };

  useEffect(() => {
    if (open) {
      resetControls();
    }
  }, [open, pdfUrl]);

  const pdfViewerUrl = `${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&page=${currentPage}&zoom=${Math.round(zoom * 100)}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PictureAsPdf sx={{ color: 'error.main' }} />
            <Typography variant="h6" component="span" sx={{
              maxWidth: 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {filename}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <Toolbar variant="dense" sx={{ minHeight: '48px !important', gap: 1, flexWrap: 'wrap' }}>
        <Tooltip title="Zoom Out">
          <IconButton onClick={handleZoomOut} disabled={zoom <= 0.25} size="small">
            <ZoomOut />
          </IconButton>
        </Tooltip>
        
        <Chip
          label={`${Math.round(zoom * 100)}%`}
          size="small"
          variant="outlined"
          sx={{ minWidth: 60, fontSize: '0.75rem' }}
        />
        
        <Tooltip title="Zoom In">
          <IconButton onClick={handleZoomIn} disabled={zoom >= 3} size="small">
            <ZoomIn />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <Tooltip title="Rotate Left">
          <IconButton onClick={handleRotateLeft} size="small">
            <RotateLeft />
          </IconButton>
        </Tooltip>

        <Tooltip title="Rotate Right">
          <IconButton onClick={handleRotateRight} size="small">
            <RotateRight />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <Tooltip title="Previous Page">
          <IconButton
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage <= 1}
            size="small"
          >
            <NavigateBefore />
          </IconButton>
        </Tooltip>

        <Chip
          label={`${currentPage} / ${totalPages}`}
          size="small"
          variant="outlined"
          sx={{ minWidth: 70, fontSize: '0.75rem' }}
        />

        <Tooltip title="Next Page">
          <IconButton
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
            size="small"
          >
            <NavigateNext />
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <Tooltip title="Fullscreen">
          <IconButton onClick={handleFullscreen} size="small">
            <Fullscreen />
          </IconButton>
        </Tooltip>

        <Tooltip title="Download">
          <IconButton
            component="a"
            href={pdfUrl}
            download={filename}
            target="_blank"
            rel="noopener"
            size="small"
          >
            <Download />
          </IconButton>
        </Tooltip>
      </Toolbar>

      <Divider />

      <DialogContent sx={{ flex: 1, p: 0, display: 'flex', flexDirection: 'column' }}>
        {isLoading && (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1
          }}>
            <CircularProgress />
          </Box>
        )}
        
        {error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        ) : (
          <Box sx={{
            flex: 1,
            display: 'flex',
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.3s ease'
          }}>
            <iframe
              id="pdf-iframe"
              src={pdfViewerUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                transform: `scale(${zoom})`,
                transformOrigin: 'top left'
              }}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError('Failed to load PDF. Please try downloading the file instead.');
              }}
              title={`PDF Viewer - ${filename}`}
            />
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};


const AdminDashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{url: string, filename: string} | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [wsReconnectAttempts, setWsReconnectAttempts] = useState(0);
  const [newUploadNotification, setNewUploadNotification] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // --- NEW --- State for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<Set<number>>(new Set());

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<Invoice[]>('/api/invoices', { withCredentials: true });
      setInvoices(response.data);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Could not retrieve file data. Ensure the backend is running and you are logged in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = useCallback(() => {
    if (!realTimeUpdates) return;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/admin`;
      wsRef.current = new WebSocket(wsUrl);
      setConnectionStatus(ConnectionStatus.CONNECTING);
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus(ConnectionStatus.CONNECTED);
        setWsReconnectAttempts(0);
      };
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_UPLOAD') {
          const newInvoice: Invoice = data.invoice;

          setInvoices(prev => {
            // --- ADD THIS CHECK ---
            // If the invoice ID already exists in the state, don't add it again.
            if (prev.some(inv => inv.id === newInvoice.id)) {
              return prev;
            }
            // Otherwise, add the new invoice to the top of the list.
            return [newInvoice, ...prev];
          });

      setNewUploadNotification(`New upload: ${newInvoice.originalFilename}`);
    } else if (data.type === 'UPLOAD_DELETED') {
            // --- MODIFIED --- This now correctly removes deleted items from state
            setInvoices(prev => prev.filter(inv => inv.id !== data.invoiceId));
          } else if (data.type === 'REFRESH_DATA') {
            fetchInvoices();
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
        if (realTimeUpdates && event.code !== 1000) {
          attemptReconnect();
        }
      };
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus(ConnectionStatus.ERROR);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus(ConnectionStatus.ERROR);
      attemptReconnect();
    }
  }, [realTimeUpdates]);

  const attemptReconnect = useCallback(() => {
    if (wsReconnectAttempts < 5) {
      const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        setWsReconnectAttempts(prev => prev + 1);
        connectWebSocket();
      }, delay);
    }
  }, [wsReconnectAttempts, connectWebSocket]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) wsRef.current.close(1000, 'Component unmounting');
    wsRef.current = null;
    setConnectionStatus(ConnectionStatus.DISCONNECTED);
    setWsReconnectAttempts(0);
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (realTimeUpdates) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }
    return () => disconnectWebSocket();
  }, [realTimeUpdates, connectWebSocket, disconnectWebSocket]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleViewPdf = (invoice: Invoice) => {
    setSelectedPdf({ url: `/files/${invoice.savedFilename}`, filename: invoice.originalFilename });
    setPdfViewerOpen(true);
  };
  const handleClosePdfViewer = () => setPdfViewerOpen(false);

  // --- NEW --- Function to handle deletion requests
  const handleDeleteInvoices = async () => {
    try {
      const deletePromises = Array.from(itemsToDelete).map(id =>
        axios.delete(`/api/invoices/${id}`, { withCredentials: true })
      );
      await Promise.all(deletePromises);

      // UI will update via WebSocket message, but we can also do it instantly on the client
      setInvoices(prev => prev.filter(inv => !itemsToDelete.has(inv.id)));
      setSelectedRows(prev => {
        const newSelected = new Set(prev);
        itemsToDelete.forEach(id => newSelected.delete(id));
        return newSelected;
      });

    } catch (err) {
      setError('An error occurred while deleting the file(s).');
      console.error(err);
    } finally {
      setIsDeleteDialogOpen(false);
      setItemsToDelete(new Set());
    }
  };

  const openDeleteDialog = (ids: number[]) => {
    setItemsToDelete(new Set(ids));
    setIsDeleteDialogOpen(true);
  };

  // Sorting and filtering logic (unchanged)
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices.filter(invoice =>
      invoice.originalFilename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.ipAddress.includes(searchTerm)
    );
    return filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      if (sortField === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }
      return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
    });
  }, [invoices, searchTerm, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    const isAsc = sortField === field && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedRows(new Set(filteredAndSortedInvoices.map(inv => inv.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  // Bulk action handlers (unchanged for download/export)
  const handleBulkDownload = () => {
    selectedRows.forEach(id => {
      const invoice = invoices.find(inv => inv.id === id);
      if (invoice) {
        const link = document.createElement('a');
        link.href = `/files/${invoice.savedFilename}`;
        link.download = invoice.originalFilename;
        link.click();
      }
    });
    setAnchorEl(null);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Filename', 'IP Address', 'File Size', 'Upload Date'],
      ...filteredAndSortedInvoices.map(inv => [
        inv.originalFilename,
        inv.ipAddress,
        formatFileSize(inv.fileSize),
        new Date(inv.createdAt).toLocaleString('de-DE')
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setAnchorEl(null);
  };

  // Connection status helpers (unchanged)
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED: return 'success';
      case ConnectionStatus.CONNECTING: return 'warning';
      case ConnectionStatus.ERROR: return 'error';
      default: return 'default';
    }
  };
  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED: return <Wifi />;
      case ConnectionStatus.CONNECTING: return <CircularProgress size={20} />;
      default: return <WifiOff />;
    }
  };


  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" component="h1">Admin Dashboard</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={<Switch checked={realTimeUpdates} onChange={(e) => setRealTimeUpdates(e.target.checked)} size="small" />}
              label="Real-time Updates"
            />
            {realTimeUpdates && (
              <Tooltip title={`Connection: ${connectionStatus}`}>
                <Chip icon={getConnectionStatusIcon()} label={connectionStatus} color={getConnectionStatusColor()} size="small" />
              </Tooltip>
            )}
            <Tooltip title="Toggle Dark Mode">
              <IconButton onClick={() => setDarkMode(!darkMode)} color="primary">
                {darkMode ? <LightMode /> : <DarkMode />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh Data">
              <IconButton onClick={fetchInvoices} color="primary" disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {!loading && <StatisticsCards invoices={invoices} />}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <TextField
            placeholder="Search files or IP addresses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
            size="small"
            sx={{ flexGrow: 1 }}
          />
          {selectedRows.size > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={`${selectedRows.size} selected`} size="small" />
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}><MoreVert /></IconButton>
              {/* --- MODIFIED --- Added Delete option to menu */}
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                <MenuItem onClick={handleBulkDownload}>
                  <ListItemIcon><GetApp /></ListItemIcon>
                  <ListItemText>Download Selected</ListItemText>
                </MenuItem>
                <MenuItem onClick={exportToCSV}>
                  <ListItemIcon><FileDownload /></ListItemIcon>
                  <ListItemText>Export to CSV</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => {
                  openDeleteDialog(Array.from(selectedRows));
                  setAnchorEl(null);
                }}>
                  <ListItemIcon><Delete sx={{ color: 'error.main' }} /></ListItemIcon>
                  <ListItemText sx={{ color: 'error.main' }}>Delete Selected</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Paper sx={{ boxShadow: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 'bold', backgroundColor: 'action.hover' } }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedRows.size > 0 && selectedRows.size < filteredAndSortedInvoices.length}
                        checked={filteredAndSortedInvoices.length > 0 && selectedRows.size === filteredAndSortedInvoices.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>
                      <TableSortLabel active={sortField === 'originalFilename'} direction={sortField === 'originalFilename' ? sortOrder : 'asc'} onClick={() => handleSort('originalFilename')}>
                        File Name
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel active={sortField === 'ipAddress'} direction={sortField === 'ipAddress' ? sortOrder : 'asc'} onClick={() => handleSort('ipAddress')}>
                        IP Address
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel active={sortField === 'fileSize'} direction={sortField === 'fileSize' ? sortOrder : 'asc'} onClick={() => handleSort('fileSize')}>
                        Size
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel active={sortField === 'createdAt'} direction={sortField === 'createdAt' ? sortOrder : 'asc'} onClick={() => handleSort('createdAt')}>
                        Uploaded On
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                        {searchTerm ? 'No files match your search.' : 'No files have been uploaded yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedInvoices.map((invoice) => (
                      <TableRow key={invoice.id} hover selected={selectedRows.has(invoice.id)}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={selectedRows.has(invoice.id)} onChange={() => handleSelectRow(invoice.id)} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PictureAsPdf sx={{ color: 'error.main', flexShrink: 0 }} />
                            <Tooltip title={invoice.originalFilename}>
                              <span>{invoice.originalFilename}</span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Dns sx={{ color: 'grey.600', fontSize: '1rem' }} />
                            {invoice.ipAddress}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{formatFileSize(invoice.fileSize)}</TableCell>
                        <TableCell>{new Date(invoice.createdAt).toLocaleString('de-DE')}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Tooltip title="View PDF">
                              <IconButton color="secondary" onClick={() => handleViewPdf(invoice)} size="small"><Visibility /></IconButton>
                            </Tooltip>
                            <Tooltip title="Download File">
                              <IconButton color="primary" href={`/files/${invoice.savedFilename}`} target="_blank" rel="noopener" size="small"><Download /></IconButton>
                            </Tooltip>
                             {/* --- NEW --- Added Delete button for each row */}
                            <Tooltip title="Delete File">
                              <IconButton color="error" onClick={() => openDeleteDialog([invoice.id])} size="small"><Delete /></IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {selectedPdf && <PDFViewer open={pdfViewerOpen} onClose={handleClosePdfViewer} pdfUrl={selectedPdf.url} filename={selectedPdf.filename} />}

        {/* --- NEW --- Render the delete confirmation dialog */}
        <DeleteConfirmationDialog
          open={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteInvoices}
          itemCount={itemsToDelete.size}
        />

        <Snackbar open={!!newUploadNotification} autoHideDuration={4000} onClose={() => setNewUploadNotification(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
          <Alert onClose={() => setNewUploadNotification(null)} severity="success" sx={{ width: '100%' }} icon={<NotificationsActive />}>
            {newUploadNotification}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
};

export default AdminDashboard;