import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ServiceCard, ServiceCardSkeleton } from '@/components/ServiceCard';
import { useCart } from '@/hooks/useCart';
import { useHorizontalScroll } from '@/hooks/useHorizontalScroll';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Filter, Grid, List, ChevronDown, ChevronRight, Home, ArrowLeft, TreePine, ChevronLeft } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  totalBookings: number;
  icon: string;
  category: string;
  estimatedDuration: number;
  isActive: boolean;
}

interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  parentId?: string | null;
  level: number;
  sortOrder: number;
  serviceCount?: number;
  isActive: boolean;
  children?: ServiceCategory[];
}

interface CategoryBreadcrumb {
  id: string;
  name: string;
  slug: string;
}

interface CategoryTreeNode extends ServiceCategory {
  children: CategoryTreeNode[];
  expanded?: boolean;
}

export default function Services() {
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<CategoryBreadcrumb[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('rating');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryTree, setShowCategoryTree] = useState(false);

  // Horizontal scrolling for Quick Access categories
  const {
    scrollContainerRef: quickAccessScrollRef,
    scrollLeft: scrollQuickAccessLeft,
    scrollRight: scrollQuickAccessRight,
    showLeftIndicator: showQuickAccessLeftIndicator,
    showRightIndicator: showQuickAccessRightIndicator,
  } = useHorizontalScroll({
    itemWidth: 120,
    scrollAmount: 240,
    enableKeyboard: false, // Disable global keyboard for this specific instance
    enableTouch: true,
  });

  // Get URL params
  const urlParams = new URLSearchParams(window.location.search);
  const categoryFromUrl = urlParams.get('category');

  useEffect(() => {
    if (categoryFromUrl && categoryFromUrl !== 'all') {
      setSelectedCategory(categoryFromUrl);
      // Load breadcrumb path for the selected category
      loadCategoryPath(categoryFromUrl);
    } else {
      setSelectedCategory('all');
      setSelectedCategoryPath([]);
    }
  }, [categoryFromUrl]);

  // Load category breadcrumb path
  const loadCategoryPath = async (categoryId: string) => {
    try {
      const path = await apiRequest('GET', `/api/v1/categories/${categoryId}/path`);
      setSelectedCategoryPath(path);
    } catch (error) {
      console.error('Error loading category path:', error);
    }
  };

  // Fetch hierarchical category tree
  const { data: categoryTree, isLoading: loadingCategories } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/v1/categories/tree'],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Fetch main categories (root level)
  const { data: mainCategories, isLoading: loadingMainCategories } = useQuery<ServiceCategory[]>({
    queryKey: ['/api/v1/services/categories/main'],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch services based on selected category
  const { data: services, isLoading: loadingServices } = useQuery<Service[]>({
    queryKey: ['/api/v1/services', selectedCategory, sortBy, priceRange, searchQuery],
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  const handleServiceBook = (serviceId: string) => {
    setLocation(`/services/${serviceId}/book`);
  };

  const handleAddToCart = (serviceId: string) => {
    const service = services?.find((s: Service) => s.id === serviceId);
    if (service) {
      addItem({
        id: service.id,
        serviceId: service.id,
        name: service.name,
        description: service.description,
        price: service.price,
        type: 'service',
        category: service.category,
        icon: service.icon,
        estimatedDuration: service.estimatedDuration,
      });
    }
  };

  // Helper functions for category management
  const toggleCategoryExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const selectCategory = async (categoryId: string, categoryName?: string) => {
    setSelectedCategory(categoryId);
    if (categoryId !== 'all') {
      await loadCategoryPath(categoryId);
    } else {
      setSelectedCategoryPath([]);
    }
    setLocation(`/services?category=${categoryId}`);
  };

  const handleQuickAccessClick = (categoryId: string) => {
    // For 2-level structure: directly select the main category to show ALL services under it
    selectCategory(categoryId);
  };

  // Build hierarchical tree structure from flat category array
  const buildCategoryTree = (categories: ServiceCategory[]): CategoryTreeNode[] => {
    const categoryMap = new Map<string, CategoryTreeNode>();
    const rootCategories: CategoryTreeNode[] = [];

    // Create map of all categories
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: [],
        expanded: expandedCategories.has(category.id),
      });
    });

    // Build tree structure
    categories.forEach(category => {
      const treeNode = categoryMap.get(category.id);
      if (!treeNode) return;

      if (!category.parentId) {
        rootCategories.push(treeNode);
      } else {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(treeNode);
        }
      }
    });

    // Sort by sortOrder within each level
    const sortChildren = (nodes: CategoryTreeNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      nodes.forEach(node => sortChildren(node.children));
    };

    sortChildren(rootCategories);
    return rootCategories;
  };

  // Memoized category tree
  const categoryTreeStructure = useMemo(() => {
    if (!categoryTree) return [];
    return buildCategoryTree(categoryTree);
  }, [categoryTree, expandedCategories]);

  // Filter categories for search
  const filterCategoriesForSearch = (categories: CategoryTreeNode[], searchTerm: string): CategoryTreeNode[] => {
    if (!searchTerm) return categories;
    
    const filterRecursive = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
      return nodes.reduce<CategoryTreeNode[]>((acc, node) => {
        const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            node.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const filteredChildren = filterRecursive(node.children);
        
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren,
            expanded: filteredChildren.length > 0 ? true : node.expanded, // Auto-expand if has matching children
          });
        }
        
        return acc;
      }, []);
    };

    return filterRecursive(categories);
  };

  const filteredCategoryTree = useMemo(() => {
    return filterCategoriesForSearch(categoryTreeStructure, searchQuery);
  }, [categoryTreeStructure, searchQuery]);

  // CategoryTree rendering component
  const CategoryTreeNode = ({ category, level = 0 }: { category: CategoryTreeNode; level?: number }) => {
    const hasChildren = category.children.length > 0;
    const isSelected = selectedCategory === category.id;
    const isExpanded = category.expanded;

    return (
      <div className="w-full">
        <div 
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
            isSelected ? 'bg-primary/10 border border-primary/20' : ''
          }`}
          style={{ marginLeft: `${level * 16}px` }}
          onClick={() => selectCategory(category.id, category.name)}
          data-testid={`category-tree-${category.id}`}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                toggleCategoryExpanded(category.id);
              }}
              data-testid={`category-expand-${category.id}`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          <span className="text-lg">{category.icon}</span>
          
          <div className="flex-1 flex items-center justify-between">
            <span className={`font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
              {category.name}
            </span>
            {category.serviceCount && category.serviceCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {category.serviceCount}
              </Badge>
            )}
          </div>
        </div>

        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {category.children.map(child => (
                <CategoryTreeNode
                  key={child.id}
                  category={child}
                  level={level + 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Breadcrumb navigation component
  const CategoryBreadcrumbs = () => {
    if (selectedCategoryPath.length === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => selectCategory('all')}
                className="flex items-center gap-2 cursor-pointer hover:text-primary"
                data-testid="breadcrumb-home"
              >
                <Home className="h-4 w-4" />
                All Services
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {selectedCategoryPath.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    onClick={() => selectCategory(crumb.id, crumb.name)}
                    className={`cursor-pointer hover:text-primary ${
                      index === selectedCategoryPath.length - 1 ? 'font-medium text-primary' : ''
                    }`}
                    data-testid={`breadcrumb-${crumb.id}`}
                  >
                    {crumb.name}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </motion.div>
    );
  };


  const filteredServices = (services || []).filter((service: Service) => {
    // Note: Category filtering is now handled by the backend API based on 2-level structure
    // The services returned are already filtered by category (main category returns ALL services under it)
    const matchesSearch = !searchQuery || 
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = priceRange === 'all' || 
      (priceRange === 'low' && service.price <= 100) ||
      (priceRange === 'medium' && service.price > 100 && service.price <= 300) ||
      (priceRange === 'high' && service.price > 300);
    
    return matchesSearch && matchesPrice;
  });

  const sortedServices = filteredServices.sort((a: Service, b: Service) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'popular':
        return b.totalBookings - a.totalBookings;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 pb-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">Our Services</h1>
          <p className="text-muted-foreground">Find the perfect service for your needs</p>
        </motion.div>

        {/* Breadcrumb Navigation */}
        <CategoryBreadcrumbs />

        {/* Hierarchical Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TreePine className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">Service Categories</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCategoryTree(!showCategoryTree)}
                  className="flex items-center gap-2"
                  data-testid="toggle-category-tree"
                >
                  {showCategoryTree ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {showCategoryTree ? 'Hide' : 'Show'} Categories
                </Button>
              </div>


              {/* Hierarchical Category Tree */}
              <AnimatePresence>
                {showCategoryTree && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-1"
                  >
                    {loadingCategories ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="h-4 w-4 animate-spin border border-current border-t-transparent rounded-full" />
                        Loading categories...
                      </div>
                    ) : filteredCategoryTree.length > 0 ? (
                      filteredCategoryTree.map(category => (
                        <CategoryTreeNode key={category.id} category={category} />
                      ))
                    ) : (
                      <div className="text-muted-foreground text-sm py-4 text-center">
                        {searchQuery ? 'No categories match your search' : 'No categories available'}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Category Access (Main Categories) */}
        {mainCategories && mainCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Quick Access:</span>
              <div className="flex gap-1">
                {showQuickAccessLeftIndicator && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={scrollQuickAccessLeft}
                    className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-sm"
                    data-testid="quick-access-scroll-left"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                {showQuickAccessRightIndicator && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={scrollQuickAccessRight}
                    className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm hover:bg-background/90 shadow-sm"
                    data-testid="quick-access-scroll-right"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="relative">
              <div 
                ref={quickAccessScrollRef}
                className="flex overflow-x-auto overflow-y-hidden gap-2 pb-2 scroll-smooth"
                style={{
                  scrollbarWidth: 'thin',
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: 'x proximity'
                }}
              >
                {mainCategories.slice(0, 8).map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => selectCategory(category.id)}
                    className="flex items-center gap-2 flex-shrink-0 scroll-snap-align-start"
                    data-testid={`quick-category-${category.id}`}
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <span>{category.icon}</span>
                    {category.name}
                    {category.serviceCount && category.serviceCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {category.serviceCount}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                
                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>

                {/* Price Range */}
                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Price range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="low">Under ₹100</SelectItem>
                    <SelectItem value="medium">₹100 - ₹300</SelectItem>
                    <SelectItem value="high">Above ₹300</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-sm text-muted-foreground mr-2">View:</span>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    data-testid="list-view"
                    className="px-3"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    data-testid="grid-view"
                    className="px-3"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Services List/Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {loadingServices ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4' : 'space-y-4'}>
              {[...Array(6)].map((_, i) => (
                <ServiceCardSkeleton key={i} variant={viewMode === 'grid' ? 'compact' : 'default'} />
              ))}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4' : 'space-y-4'}>
              {sortedServices.length > 0 ? (
                sortedServices.map((service: Service, index: number) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ServiceCard
                      id={service.id}
                      name={service.name}
                      description={service.description}
                      price={service.price}
                      rating={service.rating}
                      totalBookings={service.totalBookings}
                      icon={service.icon}
                      category={service.category}
                      estimatedDuration={service.estimatedDuration}
                      isAvailable={service.isActive}
                      onBook={handleServiceBook}
                      onAddToCart={handleAddToCart}
                      variant={viewMode === 'grid' ? 'compact' : 'default'}
                    />
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">No services found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters or search terms
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
