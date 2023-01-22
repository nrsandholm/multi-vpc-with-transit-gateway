import { Stack, StackProps } from 'aws-cdk-lib';
import { AllocateCidrRequest, IpAddresses, SubnetIpamOptions, SubnetType, Vpc, VpcIpamOptions } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpcA = new Vpc(this, 'VpcA', {
      maxAzs: 1,
      vpcName: 'VpcA',
      ipAddresses: {
        allocateSubnetsCidr: (input: AllocateCidrRequest): SubnetIpamOptions => {
          return {
            allocatedSubnets: [{
              cidr: '10.0.0.0/25',
            }, {
              cidr: '10.0.0.128/25',
            }]
          }
        },
        allocateVpcCidr: (): VpcIpamOptions => {
          return {
            cidrBlock: '10.0.0.0/24',
          }
        },
      },
      subnetConfiguration: [{
        name: 'PrivateSubnetA',
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      }, {
        name: 'PublicSubnetA',
        subnetType: SubnetType.PUBLIC,
      }]
    });

    const vpcB = new Vpc(this, 'VpcB', {
      maxAzs: 1,
      vpcName: 'VpcB',
      ipAddresses: {
        allocateSubnetsCidr: (input: AllocateCidrRequest): SubnetIpamOptions => {
          return {
            allocatedSubnets: [{
              cidr: '10.0.1.0/25',
            }, {
              cidr: '10.0.1.128/25',
            }]
          }
        },
        allocateVpcCidr: (): VpcIpamOptions => {
          return {
            cidrBlock: '10.0.1.0/24',
          }
        },
      },
      subnetConfiguration: [{
        name: 'PrivateSubnetB',
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      }, {
        name: 'PublicSubnetB',
        subnetType: SubnetType.PUBLIC,
      }]
    });
  }
}
