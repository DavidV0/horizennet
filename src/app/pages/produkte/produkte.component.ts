import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProductService } from '../../shared/services/product.service';
import { Product } from '../../shared/interfaces/product.interface';

@Component({
  selector: 'app-produkte',
  templateUrl: './produkte.component.html',
  styleUrls: ['./produkte.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class ProdukteComponent implements OnInit {
  products: Product[] = [];

  constructor(private productService: ProductService) {}

  ngOnInit() {
    this.productService.getAllProducts().subscribe(products => {
      this.products = products;
    });
  }
} 