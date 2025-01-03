export interface BlogContent {
  type: 'paragraph' | 'subheading' | 'quote' | 'list';
  text?: string;
  items?: string[];
}

export interface Blog {
  id: string;
  category: string;
  title: string;
  date: string;
  readTime: string;
  image: string;
  content: BlogContent[];
} 