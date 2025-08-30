import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Package2 } from "lucide-react";
import { type InventoryItem, type Category, type Vendor } from "@shared/schema";

interface InventoryTableProps {
  items?: (InventoryItem & { category?: Category; vendor?: Vendor })[];
  isLoading: boolean;
  showPagination?: boolean;
  maxItems?: number;
}

export default function InventoryTable({ items, isLoading, showPagination = false, maxItems }: InventoryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-20 h-6 bg-gray-200 rounded"></div>
            <div className="w-16 h-6 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No inventory items found</h3>
        <p className="text-slate-400">Start by adding your first inventory item.</p>
      </div>
    );
  }

  const getStatusBadge = (item: InventoryItem) => {
    const quantity = parseFloat(item.quantity);
    const reorderLevel = parseFloat(item.reorderLevel);
    
    if (quantity <= reorderLevel) {
      return <Badge variant="destructive">Low Stock</Badge>;
    } else if (quantity <= reorderLevel * 1.5) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium Stock</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">In Stock</Badge>;
    }
  };

  const getCategoryIcon = (categoryName?: string) => {
    // Simple icon mapping based on category
    const iconMap: Record<string, string> = {
      'proteins': '🥩',
      'vegetables': '🥕',
      'dairy': '🧀',
      'beverages': '🥤',
      'dry goods': '🌾',
      'spices': '🌿',
    };
    return iconMap[categoryName?.toLowerCase() || ''] || '📦';
  };

  // Pagination logic
  let displayItems = items;
  let totalPages = 1;
  
  if (maxItems) {
    displayItems = items.slice(0, maxItems);
  } else if (showPagination) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    displayItems = items.slice(startIndex, endIndex);
    totalPages = Math.ceil(items.length / itemsPerPage);
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayItems.map((item) => {
                const totalValue = parseFloat(item.quantity) * parseFloat(item.costPerUnit);
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-lg">
                          {getCategoryIcon(item.category?.name)}
                        </div>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-slate-400">{item.description}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.category?.name || 'Uncategorized'}
                    </TableCell>
                    <TableCell>
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell>
                      ${parseFloat(item.costPerUnit).toFixed(2)}/{item.unit}
                    </TableCell>
                    <TableCell>
                      ${totalValue.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {displayItems.map((item) => {
          const totalValue = parseFloat(item.quantity) * parseFloat(item.costPerUnit);
          
          return (
            <div key={item.id} className="bg-slate-800/50 border-slate-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-lg">
                    {getCategoryIcon(item.category?.name)}
                  </div>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-slate-400">{item.category?.name || 'Uncategorized'}</div>
                  </div>
                </div>
                {getStatusBadge(item)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Quantity:</span>
                  <div className="font-medium">{item.quantity} {item.unit}</div>
                </div>
                <div>
                  <span className="text-slate-400">Unit Cost:</span>
                  <div className="font-medium">${parseFloat(item.costPerUnit).toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Total Value:</span>
                  <div className="font-medium">${totalValue.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-slate-400">Vendor:</span>
                  <div className="font-medium">{item.vendor?.name || 'N/A'}</div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-600">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-600">
          <div className="text-sm text-slate-300">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, items.length)}</span> of{' '}
            <span className="font-medium">{items.length}</span> items
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={currentPage === page ? "bg-primary-600" : ""}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
