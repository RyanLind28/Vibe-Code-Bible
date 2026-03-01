# Infrastructure as Code

> Terraform, Pulumi, state management, modular infrastructure, environment parity, drift detection, GitOps workflows, and IaC testing — every piece of infrastructure defined, versioned, and reproducible.

---

## Principles

### 1. Everything in Code

If it is not in a repository, it does not exist. Every piece of infrastructure — servers, databases, DNS records, IAM roles, firewall rules, monitoring alerts — must be defined in code, committed to version control, and deployed through automation.

Manual changes through cloud consoles are invisible, unreviewable, and unreproducible. When the engineer who clicked through the AWS console leaves the company, that knowledge leaves with them. When you need to rebuild after a disaster, you are reconstructing from memory.

**What belongs in IaC:**

- Compute resources (VMs, containers, serverless functions)
- Networking (VPCs, subnets, security groups, load balancers, DNS)
- Data stores (databases, caches, object storage buckets)
- IAM (roles, policies, service accounts)
- Monitoring (alerts, dashboards, log pipelines)
- CI/CD infrastructure (runners, registries, deployment targets)

**What does not belong in IaC:**

- Application secrets (use a secret manager, reference by name)
- Application data (database rows, uploaded files)
- Temporary development resources (use ephemeral environments instead)

### 2. Idempotent Deployments

Running your IaC tool twice with the same configuration should produce the same result. No errors, no duplicate resources, no side effects. This is idempotency, and it is what makes IaC reliable.

Terraform and Pulumi achieve this through a state file that tracks what resources exist. When you run `terraform apply`, Terraform compares your configuration to the state file, determines what needs to change, and makes only those changes. If nothing has changed, nothing happens.

**Why idempotency matters:**

- **Safe re-runs** — if a deployment fails halfway, you can run it again without creating duplicates
- **Convergence** — the system always converges toward the desired state, regardless of the current state
- **Confidence** — you can apply changes without fear of breaking unrelated resources

**Rules:**

- Always run `terraform plan` before `terraform apply` — review what will change
- Use `create_before_destroy` lifecycle rules for zero-downtime replacements
- Avoid imperative scripts (`aws cli` commands) alongside declarative IaC — they bypass the state file and create drift
- Test idempotency by running `apply` twice — the second run should report no changes

### 3. State Management

The state file is the most critical artifact in your IaC system. It maps your declared resources to real cloud resources. Lose the state file, and Terraform does not know what it manages — it will try to create everything from scratch, conflicting with existing resources.

**State storage rules:**

- **Never commit state to git** — state files contain sensitive data (resource IDs, connection strings, sometimes passwords)
- **Use remote state** — S3 + DynamoDB (AWS), GCS (GCP), Terraform Cloud, or Spacelift
- **Enable state locking** — prevents two people from running `apply` simultaneously, which corrupts state
- **Enable versioning** — S3 bucket versioning lets you roll back a corrupted state file
- **Encrypt at rest** — state contains sensitive data, encrypt the S3 bucket or GCS bucket

```hcl
# backend.tf — remote state configuration
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/api/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

**State organization:**

- Split state by environment and service: `production/api/`, `staging/api/`, `production/database/`
- Do not put everything in one state file — a single state for all infrastructure means every change risks everything
- Use `terraform_remote_state` data source to reference outputs from other state files when services need to share information

### 4. Modular Infrastructure

Copy-pasting Terraform code between environments is the IaC equivalent of copy-pasting functions. Modules encapsulate reusable infrastructure patterns — a "database" module that creates an RDS instance, security groups, parameter groups, and monitoring in one call.

**Module structure:**

```text
modules/
├── database/
│   ├── main.tf          → resource definitions
│   ├── variables.tf     → input parameters
│   ├── outputs.tf       → values to expose
│   └── README.md        → usage documentation
├── api-service/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── networking/
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

**Module design principles:**

- A module should do one thing well — "create a database with monitoring" or "create a VPC with standard subnets"
- Expose configuration through variables, not by editing module internals
- Output everything downstream modules might need (IDs, ARNs, endpoints, connection strings)
- Pin module versions — `source = "./modules/database"` for local, `source = "git::https://...?ref=v1.2.0"` for remote
- Document every variable and output with descriptions
- Keep modules small enough to understand in 5 minutes

### 5. Environment Parity

Development, staging, and production should be structurally identical. Same resources, same configuration shape, different parameters (instance sizes, replica counts, domain names). Environment differences should be limited to scale and secrets.

**How to achieve parity:**

- Use the same Terraform modules for all environments
- Parameterize differences through variable files: `environments/production.tfvars`, `environments/staging.tfvars`
- Keep the resource graph identical — if production has a Redis cache, staging has a Redis cache (smaller, but present)
- Use workspaces or directory-based environment separation

**Directory-based (recommended):**

```text
infrastructure/
├── modules/          → shared modules
├── environments/
│   ├── production/
│   │   ├── main.tf   → uses modules with production variables
│   │   └── terraform.tfvars
│   ├── staging/
│   │   ├── main.tf   → same modules, staging variables
│   │   └── terraform.tfvars
│   └── development/
│       ├── main.tf   → same modules, dev variables
│       └── terraform.tfvars
```

Environment parity catches bugs that environment differences hide. If staging uses a single-node database and production uses a multi-node cluster, you will discover replication issues in production.

### 6. Drift Detection

Drift is when the actual state of your infrastructure diverges from the declared state. Someone manually changed a security group rule, resized an instance through the console, or added an IAM policy by hand. Your code says one thing, reality says another.

**Detecting drift:**

- Run `terraform plan` on a schedule (daily or on every PR) — if it shows unexpected changes, someone made manual modifications
- Use `terraform refresh` cautiously — it updates state to match reality, which is useful but can mask problems
- Tools like Spacelift, Env0, and Terraform Cloud offer automatic drift detection with notifications
- AWS Config and GCP Config Connector can detect configuration changes outside of IaC

**Preventing drift:**

- Lock down cloud console access — most engineers should not be able to modify production resources manually
- Use SCPs (AWS Service Control Policies) to prevent manual changes in production accounts
- Tag all IaC-managed resources so manual changes are immediately visible
- Treat any drift as a bug — investigate, fix the root cause, and update the code to match the desired state

### 7. Least-Privilege IAM

IAM (Identity and Access Management) is the most common source of security misconfigurations in cloud infrastructure. Over-scoped roles grant more access than needed, creating blast radius when credentials are compromised.

**Least-privilege rules:**

- Every service gets its own IAM role — no shared roles between services
- Grant only the permissions the service actually needs — `s3:GetObject` on a specific bucket, not `s3:*` on all buckets
- Use condition keys to restrict access further (source IP, time, MFA requirement)
- Avoid wildcard (`*`) resources and actions — scope to specific ARNs
- Review IAM policies quarterly — remove permissions that are no longer used
- Use AWS Access Analyzer or GCP IAM Recommender to identify over-permissioned roles

```hcl
# WRONG: Over-scoped IAM role
resource "aws_iam_role_policy" "too_broad" {
  role = aws_iam_role.api.id
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:*"        # All S3 operations
      Resource = "*"            # On all buckets
    }]
  })
}

# CORRECT: Scoped to specific actions and resources
resource "aws_iam_role_policy" "api_s3" {
  role = aws_iam_role.api.id
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject"]
      Resource = "${aws_s3_bucket.uploads.arn}/*"
    }]
  })
}
```

> Cross-reference: [Security/Secrets-Environment](../../Security/Secrets-Environment/secrets-environment.md) covers application-level secret management.

### 8. Secret Management in IaC

Secrets must never appear in Terraform code, variable files, or state files in plaintext. IaC references secrets by name from a secret manager — it does not contain the secret values themselves.

**Patterns:**

- **Store secrets in a secret manager** — AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, Doppler
- **Reference by name in Terraform** — use `data "aws_secretsmanager_secret_version"` to read secrets at apply time
- **Inject at runtime** — application reads secrets from the environment or secret manager SDK, not from IaC outputs
- **Rotate secrets without IaC changes** — updating a secret value in Secrets Manager should not require a Terraform apply

```hcl
# Reference a secret managed outside of Terraform
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/database/password"
}

# Use the secret value without it appearing in code
resource "aws_db_instance" "main" {
  engine         = "postgres"
  instance_class = "db.t3.medium"
  username       = "app"
  password       = data.aws_secretsmanager_secret_version.db_password.secret_string
  # password value is in the state file — ensure state is encrypted
}
```

**Warning:** Even with this approach, the password ends up in the Terraform state file. This is why state encryption and access control are critical.

### 9. Testing Infrastructure

Infrastructure changes can cause outages just like application bugs. Testing your IaC catches misconfigurations before they reach production.

**Testing levels:**

- **Static analysis** — `terraform validate`, `terraform fmt`, `tflint`, `checkov`, `tfsec`. Catch syntax errors, naming violations, and security misconfigurations without creating resources.
- **Plan review** — `terraform plan` in CI on every PR. Reviewers see exactly what resources will be created, modified, or destroyed.
- **Integration tests** — create real resources in a sandbox account, verify they work, then destroy them. Tools: Terratest (Go), `pytest` with Terraform, Kitchen-Terraform.
- **Policy as code** — OPA (Open Policy Agent), Sentinel (Terraform Cloud), or Checkov to enforce organizational policies (e.g., "all S3 buckets must have encryption enabled").

```hcl
# checkov will flag this as a violation
resource "aws_s3_bucket" "bad" {
  bucket = "my-bucket"
  # Missing: encryption, versioning, public access block
}

# checkov passes
resource "aws_s3_bucket" "good" {
  bucket = "my-bucket"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "good" {
  bucket = aws_s3_bucket.good.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "good" {
  bucket = aws_s3_bucket.good.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "good" {
  bucket                  = aws_s3_bucket.good.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

### 10. GitOps Workflow

GitOps takes "infrastructure as code" to its logical conclusion: git is the single source of truth, and all changes flow through pull requests. No one runs `terraform apply` from their laptop. A CI/CD system reconciles the desired state (in git) with the actual state (in the cloud).

**GitOps workflow:**

1. Engineer opens a PR with infrastructure changes
2. CI runs `terraform plan` and posts the plan output as a PR comment
3. Reviewer approves the PR and the plan
4. Merge triggers `terraform apply` automatically (or a manual approval step for production)
5. The apply output is logged and linked to the PR for audit

**GitOps tools:**

- **Terraform Cloud / Spacelift / Env0** — managed GitOps for Terraform with plan previews, policy checks, and state management
- **ArgoCD** — GitOps for Kubernetes, continuously reconciles cluster state with git
- **Flux** — Kubernetes-native GitOps operator

**Benefits:**

- Every change has an audit trail (git history + PR reviews)
- No one needs cloud console access for routine changes
- Rollback is a git revert
- Environment promotion is a PR from staging branch to production branch

---

## LLM Instructions

### When Generating Terraform Configs

When asked to write Terraform:

- Always include a `terraform` block with `required_providers` and `required_version`
- Use remote state backend (S3 + DynamoDB for AWS, GCS for GCP)
- Organize files as `main.tf`, `variables.tf`, `outputs.tf`, `backend.tf`, `providers.tf`
- Use modules for any pattern that repeats across environments
- Add `description` to every variable and output
- Use `locals` for computed values and string interpolation
- Tag every resource with `project`, `environment`, and `managed_by = "terraform"`
- Use `for_each` over `count` when resources need to be individually addressable
- Never hardcode values — use variables with sensible defaults
- Include data sources for existing resources rather than hardcoding IDs

### When Structuring IaC Projects

When asked to set up an IaC project:

- Use directory-based environment separation over workspaces for clarity
- Create a `modules/` directory for reusable components
- Create `environments/production/`, `environments/staging/`, `environments/development/`
- Each environment directory has its own `main.tf`, `backend.tf`, and `terraform.tfvars`
- All environments use the same modules — differences are in variables only
- Include a `Makefile` or `justfile` with common commands (`plan`, `apply`, `validate`, `fmt`)
- Set up CI to run `terraform plan` on PRs and `terraform apply` on merge to main

### When Managing State Files

When asked about Terraform state:

- Always use remote state with locking — never local state files
- Recommend S3 + DynamoDB for AWS, GCS for GCP, Terraform Cloud for multi-cloud
- Encrypt state at rest (S3 encryption, GCS encryption)
- Split state by environment and service to limit blast radius
- Never commit `*.tfstate` or `*.tfstate.backup` to git — add to `.gitignore`
- Use `terraform_remote_state` data source for cross-service references
- Back up state with S3 versioning — enables recovery from state corruption

### When Configuring Environment Variables

When setting up environment management in IaC:

- Use `.tfvars` files per environment for non-sensitive values
- Reference secrets from a secret manager, never store in `.tfvars`
- Use variable validation to catch invalid values early
- Set sensible defaults for development, require explicit values for production
- Document which variables differ between environments

### When Setting Up GitOps

When asked to implement GitOps:

- Run `terraform plan` in CI on every PR and post the plan as a comment
- Require PR approval before applying changes
- Run `terraform apply` only from CI, never from local machines
- Use environment-specific branches or directories for promotion
- Include drift detection on a daily schedule
- Log all apply outputs for audit
- Recommend Terraform Cloud or Spacelift for managed GitOps, self-hosted CI for teams that want full control

---

## Examples

### 1. Terraform Project Structure with Modules

A complete project layout with a reusable database module used across environments.

```text
infrastructure/
├── modules/
│   ├── database/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── api-service/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── networking/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── production/
│   │   ├── main.tf
│   │   ├── backend.tf
│   │   ├── providers.tf
│   │   └── terraform.tfvars
│   └── staging/
│       ├── main.tf
│       ├── backend.tf
│       ├── providers.tf
│       └── terraform.tfvars
├── .gitignore
└── Makefile
```

```hcl
# modules/database/variables.tf
variable "project" {
  description = "Project name for resource tagging"
  type        = string
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "allocated_storage" {
  description = "Storage in GB"
  type        = number
  default     = 20
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Days to retain automated backups"
  type        = number
  default     = 7
}

variable "vpc_id" {
  description = "VPC ID for security group"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "allowed_security_groups" {
  description = "Security group IDs allowed to connect"
  type        = list(string)
}
```

```hcl
# modules/database/main.tf
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}"
  subnet_ids = var.subnet_ids

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_security_group" "database" {
  name_prefix = "${var.project}-${var.environment}-db-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-${var.environment}"
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.allocated_storage * 2
  storage_encrypted     = true

  db_name  = replace(var.project, "-", "_")
  username = "app"
  # Password managed via AWS Secrets Manager, not in Terraform
  manage_master_user_password = true

  multi_az                = var.multi_az
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.database.id]
  backup_retention_period = var.backup_retention_period
  deletion_protection     = var.environment == "production"

  performance_insights_enabled = true
  monitoring_interval          = 60

  tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

```hcl
# modules/database/outputs.tf
output "endpoint" {
  description = "Database connection endpoint"
  value       = aws_db_instance.main.endpoint
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.main.db_name
}

output "security_group_id" {
  description = "Security group ID for the database"
  value       = aws_security_group.database.id
}

output "arn" {
  description = "Database instance ARN"
  value       = aws_db_instance.main.arn
}
```

```hcl
# environments/production/main.tf
module "networking" {
  source = "../../modules/networking"

  project     = "myapp"
  environment = "production"
  cidr_block  = "10.0.0.0/16"
}

module "database" {
  source = "../../modules/database"

  project     = "myapp"
  environment = "production"

  instance_class          = "db.r6g.large"
  allocated_storage       = 100
  multi_az                = true
  backup_retention_period = 30

  vpc_id                  = module.networking.vpc_id
  subnet_ids              = module.networking.private_subnet_ids
  allowed_security_groups = [module.api.security_group_id]
}

module "api" {
  source = "../../modules/api-service"

  project     = "myapp"
  environment = "production"

  database_url    = module.database.endpoint
  database_name   = module.database.database_name
  instance_count  = 3
  instance_type   = "t3.medium"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
}
```

```hcl
# environments/staging/main.tf — same modules, smaller parameters
module "networking" {
  source = "../../modules/networking"

  project     = "myapp"
  environment = "staging"
  cidr_block  = "10.1.0.0/16"
}

module "database" {
  source = "../../modules/database"

  project     = "myapp"
  environment = "staging"

  instance_class          = "db.t3.medium"  # Smaller instance
  allocated_storage       = 20               # Less storage
  multi_az                = false            # Single AZ
  backup_retention_period = 7                # Shorter retention

  vpc_id                  = module.networking.vpc_id
  subnet_ids              = module.networking.private_subnet_ids
  allowed_security_groups = [module.api.security_group_id]
}

module "api" {
  source = "../../modules/api-service"

  project     = "myapp"
  environment = "staging"

  database_url    = module.database.endpoint
  database_name   = module.database.database_name
  instance_count  = 1                    # Single instance
  instance_type   = "t3.small"           # Smaller instance

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
}
```

### 2. Pulumi TypeScript Infrastructure Stack

Infrastructure defined in TypeScript with Pulumi, providing full type safety and IDE support.

```typescript
// infra/index.ts — Pulumi stack
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const project = config.require("project");
const environment = pulumi.getStack(); // "production", "staging"

// VPC
const vpc = new aws.ec2.Vpc(`${project}-vpc`, {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: {
    Project: project,
    Environment: environment,
    ManagedBy: "pulumi",
  },
});

// Subnets
const publicSubnets = ["10.0.1.0/24", "10.0.2.0/24"].map(
  (cidr, index) =>
    new aws.ec2.Subnet(`${project}-public-${index}`, {
      vpcId: vpc.id,
      cidrBlock: cidr,
      availabilityZone: `us-east-1${["a", "b"][index]}`,
      mapPublicIpOnLaunch: true,
      tags: {
        Project: project,
        Environment: environment,
        Type: "public",
      },
    })
);

const privateSubnets = ["10.0.10.0/24", "10.0.11.0/24"].map(
  (cidr, index) =>
    new aws.ec2.Subnet(`${project}-private-${index}`, {
      vpcId: vpc.id,
      cidrBlock: cidr,
      availabilityZone: `us-east-1${["a", "b"][index]}`,
      tags: {
        Project: project,
        Environment: environment,
        Type: "private",
      },
    })
);

// Database
const dbSubnetGroup = new aws.rds.SubnetGroup(`${project}-db`, {
  subnetIds: privateSubnets.map((s) => s.id),
  tags: { Project: project, Environment: environment },
});

const dbSecurityGroup = new aws.ec2.SecurityGroup(`${project}-db-sg`, {
  vpcId: vpc.id,
  ingress: [
    {
      protocol: "tcp",
      fromPort: 5432,
      toPort: 5432,
      cidrBlocks: ["10.0.0.0/16"],
    },
  ],
  tags: { Project: project, Environment: environment },
});

const isProduction = environment === "production";

const database = new aws.rds.Instance(`${project}-db`, {
  engine: "postgres",
  engineVersion: "16.1",
  instanceClass: isProduction ? "db.r6g.large" : "db.t3.medium",
  allocatedStorage: isProduction ? 100 : 20,
  multiAz: isProduction,
  dbName: project.replace(/-/g, "_"),
  username: "app",
  manageMasterUserPassword: true,
  dbSubnetGroupName: dbSubnetGroup.name,
  vpcSecurityGroupIds: [dbSecurityGroup.id],
  backupRetentionPeriod: isProduction ? 30 : 7,
  deletionProtection: isProduction,
  storageEncrypted: true,
  performanceInsightsEnabled: true,
  tags: { Project: project, Environment: environment, ManagedBy: "pulumi" },
});

// S3 bucket for uploads
const uploadsBucket = new aws.s3.Bucket(`${project}-uploads`, {
  forceDestroy: !isProduction,
  tags: { Project: project, Environment: environment },
});

new aws.s3.BucketVersioningV2(`${project}-uploads-versioning`, {
  bucket: uploadsBucket.id,
  versioningConfiguration: { status: "Enabled" },
});

new aws.s3.BucketServerSideEncryptionConfigurationV2(
  `${project}-uploads-encryption`,
  {
    bucket: uploadsBucket.id,
    rules: [{ applyServerSideEncryptionByDefault: { sseAlgorithm: "AES256" } }],
  }
);

new aws.s3.BucketPublicAccessBlock(`${project}-uploads-public-access`, {
  bucket: uploadsBucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});

// Exports
export const vpcId = vpc.id;
export const dbEndpoint = database.endpoint;
export const dbName = database.dbName;
export const bucketName = uploadsBucket.id;
```

### 3. Environment Variable Management

Managing environment-specific configuration with Terraform variable files and validation.

```hcl
# variables.tf — shared variable definitions with validation
variable "project" {
  description = "Project name"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,20}$", var.project))
    error_message = "Project must be lowercase alphanumeric with hyphens, 3-21 characters."
  }
}

variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "api_instance_count" {
  description = "Number of API instances"
  type        = number
  default     = 1

  validation {
    condition     = var.api_instance_count >= 1 && var.api_instance_count <= 20
    error_message = "Instance count must be between 1 and 20."
  }
}

variable "enable_monitoring" {
  description = "Enable detailed monitoring and alerting"
  type        = bool
  default     = true
}

variable "domain" {
  description = "Application domain name"
  type        = string
}
```

```hcl
# environments/production/terraform.tfvars
project            = "myapp"
environment        = "production"
region             = "us-east-1"
api_instance_count = 3
enable_monitoring  = true
domain             = "api.myapp.com"
```

```hcl
# environments/staging/terraform.tfvars
project            = "myapp"
environment        = "staging"
region             = "us-east-1"
api_instance_count = 1
enable_monitoring  = true
domain             = "api.staging.myapp.com"
```

```hcl
# environments/development/terraform.tfvars
project            = "myapp"
environment        = "development"
region             = "us-east-1"
api_instance_count = 1
enable_monitoring  = false
domain             = "api.dev.myapp.com"
```

```makefile
# Makefile — common operations
.PHONY: plan apply validate fmt

ENV ?= staging

validate:
	cd environments/$(ENV) && terraform validate

fmt:
	terraform fmt -recursive

plan:
	cd environments/$(ENV) && terraform plan -out=tfplan

apply:
	cd environments/$(ENV) && terraform apply tfplan

plan-production:
	cd environments/production && terraform plan -out=tfplan

apply-production:
	@echo "WARNING: Applying to production. Press Ctrl+C to cancel."
	@sleep 5
	cd environments/production && terraform apply tfplan
```

### 4. GitOps CI/CD Pipeline for Terraform

GitHub Actions workflow that runs plan on PRs and apply on merge, with plan output posted as a PR comment.

```yaml
# .github/workflows/terraform.yml
name: Terraform

on:
  push:
    branches: [main]
    paths: ["infrastructure/**"]
  pull_request:
    branches: [main]
    paths: ["infrastructure/**"]

permissions:
  contents: read
  pull-requests: write
  id-token: write  # For OIDC authentication

env:
  TF_VERSION: "1.7.0"
  WORKING_DIR: "infrastructure/environments/production"

jobs:
  plan:
    name: Terraform Plan
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      # OIDC authentication — no long-lived AWS keys
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/terraform-ci
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform init -input=false

      - name: Terraform Validate
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform validate

      - name: Terraform Plan
        id: plan
        working-directory: ${{ env.WORKING_DIR }}
        run: |
          terraform plan -input=false -no-color -out=tfplan 2>&1 | tee plan_output.txt
          echo "plan_exitcode=$?" >> $GITHUB_OUTPUT

      # Post plan output as PR comment
      - name: Post Plan to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync(
              '${{ env.WORKING_DIR }}/plan_output.txt', 'utf8'
            );
            const truncated = plan.length > 60000
              ? plan.substring(0, 60000) + '\n\n... (truncated)'
              : plan;

            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `### Terraform Plan\n\n\`\`\`\n${truncated}\n\`\`\``
            });

      - uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: ${{ env.WORKING_DIR }}/tfplan
          retention-days: 1

  apply:
    name: Terraform Apply
    runs-on: ubuntu-latest
    timeout-minutes: 30
    needs: [plan]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TF_VERSION }}

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/terraform-ci
          aws-region: us-east-1

      - uses: actions/download-artifact@v4
        with:
          name: tfplan
          path: ${{ env.WORKING_DIR }}

      - name: Terraform Init
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform init -input=false

      - name: Terraform Apply
        working-directory: ${{ env.WORKING_DIR }}
        run: terraform apply -input=false -auto-approve tfplan

      - name: Notify
        if: always()
        run: |
          STATUS="${{ job.status }}"
          curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"Terraform apply ${STATUS}: ${{ github.sha }}\"}"
```

---

## Common Mistakes

### 1. Committing State Files

**Wrong:**

```text
# State files committed to git
infrastructure/
├── main.tf
├── terraform.tfstate        # Contains secrets and resource metadata
└── terraform.tfstate.backup
```

**Fix:** Add `*.tfstate` and `*.tfstate.backup` to `.gitignore`. Use remote state (S3, GCS, Terraform Cloud) with encryption and locking. State files contain sensitive data and must never be in version control.

```text
# .gitignore
*.tfstate
*.tfstate.backup
.terraform/
*.tfplan
```

### 2. No Remote State Locking

**Wrong:** Two engineers run `terraform apply` simultaneously. Both read the same state, both make changes, and the second apply overwrites the first — creating orphaned resources that Terraform no longer knows about.

**Fix:** Use a state backend that supports locking. For AWS, use S3 with a DynamoDB table for state locking. Terraform acquires the lock before apply and releases it after.

```hcl
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"  # Enables locking
  }
}
```

### 3. Hardcoding Values

**Wrong:**

```hcl
resource "aws_db_instance" "main" {
  instance_class = "db.r6g.large"   # What if staging needs db.t3.medium?
  allocated_storage = 100            # What about development?
  multi_az = true                    # Not needed for staging
  # Copy-pasted across environments with manual edits
}
```

**Fix:** Use variables for everything that differs between environments. Set sensible defaults for development. Require explicit values for production.

```hcl
resource "aws_db_instance" "main" {
  instance_class    = var.instance_class
  allocated_storage = var.allocated_storage
  multi_az          = var.multi_az
}
```

### 4. No Modules — Copy-Paste Infrastructure

**Wrong:** Three environment directories with identical resource definitions, manually kept in sync. A change to the database configuration requires editing three files.

**Fix:** Extract shared patterns into modules. Environments become thin configuration layers that call modules with environment-specific variables. A change to the module propagates to all environments on the next apply.

### 5. Manual Changes Alongside IaC

**Wrong:** An engineer modifies a security group rule through the AWS console during an incident. The change works, but Terraform does not know about it. The next `terraform apply` reverts the change, reopening the vulnerability.

**Fix:** All changes go through IaC. If an emergency requires a manual change, immediately update the Terraform code to match. Run `terraform plan` to verify state is consistent. Use drift detection to catch manual changes automatically.

### 6. No Plan Before Apply

**Wrong:**

```bash
# Yolo — apply without seeing what changes
terraform apply -auto-approve
```

**Fix:** Always run `terraform plan` first. Review the plan output. In CI, require plan output as a PR comment for reviewer visibility. Only use `-auto-approve` in automated pipelines after a reviewed plan.

```bash
# Correct workflow
terraform plan -out=tfplan     # Review the plan
terraform apply tfplan         # Apply the reviewed plan
```

### 7. Over-Scoped IAM Roles

**Wrong:**

```hcl
resource "aws_iam_role_policy" "admin" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = "*"
      Resource = "*"
    }]
  })
}
# Every service has admin access — one compromised service compromises everything
```

**Fix:** Follow least-privilege. Each service gets only the permissions it needs, scoped to the specific resources it accesses. Use AWS IAM Access Analyzer to identify unused permissions and tighten policies.

### 8. Not Versioning Provider Plugins

**Wrong:** Different team members get different results because they are running different Terraform provider versions. A provider upgrade introduces a breaking change that goes unnoticed until production.

**Fix:** Use a `.terraform.lock.hcl` file (generated by `terraform init`) and commit it to version control. This ensures everyone and CI uses the exact same provider versions.

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"  # Pin to minor version
    }
  }
  required_version = ">= 1.7.0"
}
```

---

> **See also:** [CICD](../CICD/cicd.md) | [Cloud-Architecture](../Cloud-Architecture/cloud-architecture.md) | [Monitoring-Logging](../Monitoring-Logging/monitoring-logging.md) | [Docker-Containers](../Docker-Containers/docker-containers.md) | [Security/Secrets-Environment](../../Security/Secrets-Environment/secrets-environment.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
