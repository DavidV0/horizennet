import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ShopService } from '../../../shared/services/shop.service';
import { ShopProduct } from '../../../shared/interfaces/shop-product.interface';
import { ProductFormDialogComponent } from './product-form-dialog/product-form-dialog.component';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-shop',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop.component.scss']
})
export class AdminShopComponent {
  products$: Observable<ShopProduct[]>;

  constructor(private shopService: ShopService, private dialog: MatDialog) {
    this.products$ = this.shopService.getAllProducts();
  }

  openProductDialog(product?: ShopProduct) {
    const dialogRef = this.dialog.open(ProductFormDialogComponent, {
      width: '600px',
      data: product || {}
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        try {
          if (product?.id) {
            await this.shopService.updateProduct(product.id, result);
          } else {
            await this.shopService.createProduct(result);
          }
          // Aktualisiere die Produktliste
          this.products$ = this.shopService.getAllProducts();
        } catch (error) {
          console.error('Error saving product:', error);
        }
      }
    });
  }

  async deleteProduct(productId: string) {
    if (confirm('Sind Sie sicher, dass Sie dieses Produkt löschen möchten?')) {
      try {
        await this.shopService.deleteProduct(productId);
        // Aktualisiere die Produktliste
        this.products$ = this.shopService.getAllProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  }
}