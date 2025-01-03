import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ProductService } from '../../../shared/services/product.service';
import { Product } from '../../../shared/interfaces/product.interface';
import { Subscription } from 'rxjs';
import { ProductDialogComponent } from '../../components/product-dialog/product-dialog.component';

@Component({
  selector: 'app-admin-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ]
})
export class ProductsComponent implements OnInit, OnDestroy {
  dataSource = new MatTableDataSource<Product>([]);
  displayedColumns: string[] = ['image', 'title', 'shortDescription', 'actions'];
  private subscription?: Subscription;

  constructor(
    private productService: ProductService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.subscription = this.productService.getAllProducts()
      .subscribe({
        next: (products) => {
          this.dataSource.data = products && products.length > 0 ? products : [];
        },
        error: (error) => {
          this.dataSource.data = [];
        }
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async onDelete(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await this.productService.deleteProduct(id);
        this.loadProducts();
      } catch (error) {
        // Handle error appropriately
      }
    }
  }

  onEdit(product: Product): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '600px',
      data: { product }
    });

    dialogRef.afterClosed().subscribe(async (result: Product) => {
      if (result) {
        try {
          await this.productService.updateProduct(result.id, result);
          this.loadProducts();
        } catch (error) {
          // Handle error appropriately
        }
      }
    });
  }

  onAdd(): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '600px',
      data: { product: null }
    });

    dialogRef.afterClosed().subscribe(async (result: Product) => {
      if (result) {
        try {
          await this.productService.createProduct(result);
          this.loadProducts();
        } catch (error) {
          // Handle error appropriately
        }
      }
    });
  }
}
