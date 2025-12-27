# Klondike Solitaire

A React TypeScript implementation of the classic Klondike solitaire card game, deployed as a static website on AWS.

## Features

- **Classic Klondike Rules**: 7-column tableau layout with traditional gameplay
- **Multiple Game Modes**:
  - 1 or 2 deck modes
  - Draw 1 or 3 cards from stock
- **Intuitive Controls**:
  - Drag-and-drop card movement
  - Click-to-select and click-to-move
  - Double-click to auto-move cards to foundations
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop devices
- **Smart Foundation Placement**: Cards automatically go to the correct foundation when dropped
- **Multi-card Selection**: Visual highlighting of entire card sequences
- **Undo Functionality**: Step back through move history
- **Victory Animation**: Fireworks celebration when you win
- **Move Counter**: Track your progress
- **Professional Card Graphics**: SVG images from Wikimedia Commons (Byron Knoll set, Public Domain)

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Package Manager**: Bun
- **Deployment**: AWS S3 + CloudFront (via Terraform/OpenTofu)

## Project Structure

```
/frontend         - React application
  /src           - React components and game logic
  /public        - Static assets
/terraform       - Infrastructure as Code
/dev_tooling     - Development utilities
```

## Local Development

### Prerequisites

- [Bun](https://bun.sh) installed on your system
- [Go](https://golang.org) (for downloading card images)

### Setup

1. Install frontend dependencies:
```bash
cd frontend
bun install
```

2. Download card images (if not already present):
```bash
cd dev_tooling/download_cards
go run main.go
cd ../..
```

3. Start the development server:
```bash
cd frontend
bun dev
```

The game will be available at http://localhost:5173

### Build Commands

```bash
cd frontend
bun dev      # Start development server
bun build    # Build for production
bun preview  # Preview production build
```

## AWS Deployment

The game is deployed to AWS using Terraform/OpenTofu with:
- **S3**: Static file hosting
- **CloudFront**: Global CDN distribution
- **ACM**: SSL/TLS certificates
- **Route53**: DNS management

### Prerequisites

- AWS CLI configured
- Terraform/OpenTofu installed
- Route53 hosted zone for your domain

### Deployment Steps

1. Navigate to terraform directory:
```bash
cd terraform
```

2. Create a `terraform.tfvars` file with your configuration:
```hcl
aws_region              = "eu-west-2"
environment             = "prod"
frontend_domain_name    = "klondike.yourdomain.com"
hosted_zone_name        = "yourdomain.com"
backend_bucket          = "your-terraform-state-bucket"
backend_key             = "klondike-solitaire/terraform.tfstate"
backend_region          = "eu-west-2"

default_tags = {
  Project     = "klondike-solitaire"
  Environment = "prod"
  ManagedBy   = "terraform"
}
```

3. Initialize and deploy:
```bash
terraform init
terraform plan
terraform apply
```

The frontend will be automatically built and deployed to S3, with CloudFront distribution created.

## How to Play

### Setup
- The game deals 7 tableau columns with 1, 2, 3, 4, 5, 6, 7 cards respectively
- Only the top card in each tableau column starts face-up
- Remaining cards go to the stock (draw pile)
- 4 empty foundations await (8 for 2-deck mode)

### Objective
Move all cards to the foundations, building from Ace to King by suit.

### Gameplay Rules

**Tableau Moves:**
- Cards can be moved between columns in descending rank and alternating colors
- Multi-card sequences can be moved together
- Only Kings can be placed on empty columns

**Stock/Waste:**
- Click the stock to draw cards (1 or 3 at a time, based on settings)
- Play the top waste card to tableau or foundations
- When stock is empty, click to recycle waste back to stock

**Foundations:**
- Must start with an Ace
- Build up in sequence by suit (Ace → 2 → 3 ... → King)
- Cards can be moved from foundations back to tableau if needed

**Shortcuts:**
- Double-click any card to auto-move it to the appropriate foundation
- Drag cards to any foundation space - they'll go to the correct one
- When stock and waste are empty and all cards are face-up, remaining cards auto-complete

### Controls

**Slider Switches:**
- **Decks**: Toggle between 1 and 2 deck modes
- **Draw**: Toggle between drawing 1 or 3 cards

**Buttons:**
- **Undo**: Step back one move
- **New Game**: Start a fresh game with current settings

## Card Images

Card images are from Wikimedia Commons by Byron Knoll and are in the Public Domain. The download script fetches all 52 card faces plus blue and red card backs.

## Terraform Documentation

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
|------|---------|
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | >= 1.10.0 |
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | >=6.26.0 |

## Providers

| Name | Version |
|------|---------|
| <a name="provider_aws"></a> [aws](#provider\_aws) | 6.27.0 |
| <a name="provider_null"></a> [null](#provider\_null) | 3.2.4 |

## Modules

| Name | Source | Version |
|------|--------|---------|
| <a name="module_frontend_website"></a> [frontend\_website](#module\_frontend\_website) | registry.terraform.io/joshuamkite/static-website-s3-cloudfront-acm/aws | 2.4.0 |

## Resources

| Name | Type |
|------|------|
| [null_resource.build_frontend](https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource) | resource |
| [null_resource.invalidate_cloudfront](https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource) | resource |
| [null_resource.sync_frontend_to_s3](https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource) | resource |
| [aws_caller_identity.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity) | data source |
| [aws_region.current](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region) | data source |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| <a name="input_aws_region"></a> [aws\_region](#input\_aws\_region) | AWS region for deployment | `string` | `"eu-west-2"` | no |
| <a name="input_backend_bucket"></a> [backend\_bucket](#input\_backend\_bucket) | S3 bucket name for Terraform state | `string` | n/a | yes |
| <a name="input_backend_key"></a> [backend\_key](#input\_backend\_key) | S3 key path for Terraform state | `string` | n/a | yes |
| <a name="input_backend_region"></a> [backend\_region](#input\_backend\_region) | AWS region for Terraform state bucket | `string` | n/a | yes |
| <a name="input_default_tags"></a> [default\_tags](#input\_default\_tags) | Default tags to apply to all resources | `map(string)` | `{}` | no |
| <a name="input_environment"></a> [environment](#input\_environment) | Environment name (dev, staging, prod) | `string` | `"dev"` | no |
| <a name="input_frontend_domain_name"></a> [frontend\_domain\_name](#input\_frontend\_domain\_name) | Domain name for the React frontend | `string` | n/a | yes |
| <a name="input_frontend_parent_zone_name"></a> [frontend\_parent\_zone\_name](#input\_frontend\_parent\_zone\_name) | Parent hosted zone name for frontend (for subdomains). If not set, uses hosted\_zone\_name | `string` | `""` | no |
| <a name="input_hosted_zone_name"></a> [hosted\_zone\_name](#input\_hosted\_zone\_name) | Route53 hosted zone name for DNS | `string` | n/a | yes |
| <a name="input_project_name"></a> [project\_name](#input\_project\_name) | Name of the project | `string` | `"klondike-solitaire"` | no |

## Outputs

| Name | Description |
|------|-------------|
| <a name="output_cloudfront_distribution_id"></a> [cloudfront\_distribution\_id](#output\_cloudfront\_distribution\_id) | CloudFront distribution ID |
| <a name="output_cloudfront_domain_name"></a> [cloudfront\_domain\_name](#output\_cloudfront\_domain\_name) | CloudFront distribution domain name |
| <a name="output_s3_bucket_id"></a> [s3\_bucket\_id](#output\_s3\_bucket\_id) | S3 bucket ID for frontend |
| <a name="output_website_url"></a> [website\_url](#output\_website\_url) | Website URL |
<!-- END_TF_DOCS -->

## License

Card images by Byron Knoll, from [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_English_pattern_playing_cards) (Public Domain)
