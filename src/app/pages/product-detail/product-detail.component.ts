import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../../shared/services/product.service';
import { Product } from '../../shared/interfaces/product.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class ProductDetailComponent implements OnInit {
  product?: Product;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService
  ) {}

  async ngOnInit() {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.product = await this.productService.getProduct(productId);
    }
  }

  getFeatureIcon(index: number): string {
    const icons = ['diamond', 'trending_up', 'psychology', 'rocket_launch', 'auto_awesome', 'workspace_premium'];
    return icons[index % icons.length];
  }
} 