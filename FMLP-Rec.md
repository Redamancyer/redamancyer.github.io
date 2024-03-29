# Filter-enhanced MLP is All You Need for Sequential Recommendation

> WWW ’22, April 25–29, 2022，Kun Zhou，Hui Yu...|[源码](https://github.com/RUCAIBox/FMLP-Rec)

## **ABSTRACT**

越来越多的工作表明复杂的Transformer架构可能不是进行序列表示建模的最优模型，其中过多的参数量反而一定程度上带来了过拟合的风险，该风险在某些噪声较大的场景下会严重影响模型效果。本文针对序列化推荐问题，通过一系列分析实验发现该场景下滤波算法可以减少该过拟合问题并极大提升Transformer模型的效果，且在Transformer架构基础上将multi-head attention替换为**频域下的MLP层**，可以模拟**滤波机制**并进一步提升模型效果。

## 1. INTRODUCTION

Transformer基础方法通过堆叠多头自我注意层，在这项任务中表现出显着的性能。然而，堆叠的自我注意层涉及大量参数，这可能导致过度参数化。考虑到上述问题，我们的目标是简化变换器基础的顺序推荐以及增加其鲁棒性来抵御记录数据中的噪声。我们的关键思想是从数字信号处理领域借用的，其中过滤算法用于减少噪声数据的影响。

## 2. PRELIMINARIES

### 2.1 Problem Statement

给定用户的上下文：$𝑐 = {𝑖_{1}, · · · , 𝑖_{𝑛} }$，预测第(𝑛 + 1)步, 表示为$𝑝 (𝑖_{𝑛+1}|𝑖_{1:𝑛})$.

### 2.2 Fourier Transform

**Discrete Fourier transform**：

在本文中，我们只考虑1D DFT。给定序列{𝑥<sub>𝑛</sub>}与𝑛∈[0，𝑁 - 1]，1d DFT将序列转换为频域：

![MommyTalk1649316321705](_images/FMLP-Rec/MommyTalk1649316321705.svg)

其中𝑖是虚构的单位。对于每个𝑘，DFT生成一个新的表示𝑋<sub>𝑘</sub>，它是所有原始输入令牌𝑥<sub>𝑛</sub>的和，具有所谓的“旋转因子”。以这种方式，𝑋<sub>𝑘</sub> 表示序列 {𝑥<sub>𝑛</sub>}在频率 𝜔<sub>𝑘</sub> = 2𝜋𝑘/𝑁 的频谱。请注意，DFT是一对一的转换。给定离散傅立叶变换𝑋<sub>𝑘</sub>，我们可以通过逆离散傅立叶变换恢复原始序列{𝑥<sub>𝑛</sub>}：

![MommyTalk1649316361638](_images/FMLP-Rec/MommyTalk1649316361638.svg)

**Fast Fourier Transform**：

由于FFT可以将输入信号转换为周期性特性更容易捕获的频域，因此它广泛用于数字信号处理区域以滤波噪声信号。一种常用的方式是低通滤波器（LPF），可在FFT处理后衰减高频噪声信号。在本文中，我们考虑使用FFT和滤波算法来减少用户互动项目序列中的噪声功能的影响。

## 3. EMPIRICAL ANALYSIS WITH FILTERING ALGORITHMS FOR RECOMMENDATION

在本节中，我们进行了一个实证研究来测试：（1）顺序推荐模型中过滤算法的有效性，以及（2）将过滤算法与全部MLP架构集成的有效性。

### 3.1 Analysis Setup

对于实证研究，我们选择亚马逊的**Beauty**和 **Sports**数据集，以评估顺序推荐方法。我们在GRU4REC和SASREC两个代表性顺序推荐模型进行实验，直接在两个模型的嵌入层和序列编码器层之间添加非参数过滤层，并且不会更改其他组件。在滤波器层中，给定项目序列的嵌入矩阵，我们对每个特性维度进行以下操作：FFT→过滤算法→IFFT。过滤后，我们将Denoised嵌入矩阵作为序列编码器层的输入。对于过滤算法，我们选择三种古典方法：High-Pass Filter (HPF)、Low-Pass Filter (LPF)、Band-Stop Filter (BSF)。

### 3.2 Results and Findings

![image-20220327111031694](_images/FMLP-Rec/image-20220327111031694.png)

我们在基于Transformer的序列编码器层内删除多头注意力，但在嵌入层之后添加过滤器层。

![image-20220327111522808](_images/FMLP-Rec/image-20220327111522808.png)



## 4. METHOD

与Transformer类似，我们的FMLP-REC也堆叠多个神经块以产生连续用户偏好的表示。我们的方法的关键差异是用新型过滤器结构取代Transformer中的多头自注意结构。除了噪声衰减对滤波器的影响外，该滤波器层是通过在频域下的矩阵点乘来实现的，其等价于**时域中的循环卷积**，在时间复杂度更低的情况下并能够提供更大的感受野。（证明在第4.2节）。

![image-20220327130848780](_images/FMLP-Rec/image-20220327130848780.png)

### 4.1 FMLP-Rec: An All-MLP Sequential Recommender with Learnable Filters

#### 4.1.1 Embedding Layer

![MommyTalk1649316438828](_images/FMLP-Rec/MommyTalk1649316438828.svg)

由于项目和位置嵌入矩阵被随机初始化，因此可能会影响过滤机制并导致训练过程不稳定。执行dropout和layernorm操作来缓解这些问题。

#### 4.1.2 Learnable Filter-enhanced Blocks

基于嵌入层，我们通过堆叠多个可学习的过滤器块来开发项目编码器。通常由两个子层，即滤波器层和前馈网络层组成。

**Filter Layer**：

用户行为序列经Embedding层后输入滤波器层，此时会经过一次快速傅里叶变换（FFT）转换到频率域:

![MommyTalk1649316613466](_images/FMLP-Rec/MommyTalk1649316613466.svg)

经过傅里叶变换后的序列在频率域中与一个相同尺寸的可学习滤波器W进行点乘，使其频谱成分发生改变，并且滤波器通过随机梯度下降在每一轮训练中进行更新，达到自适应滤波的效果：

![MommyTalk1649316636480](_images/FMLP-Rec/MommyTalk1649316636480.svg)

最后，我们采用逆FFT将调制频谱转换为返回时域并更新序列表示：

![MommyTalk1649316662929](_images/FMLP-Rec/MommyTalk1649316662929.svg)

和SASRec一样，更新后的F输入Dropout层后会进行一次残差连接，最后进入Layer Norm层。这三种机制的应用是为了防止训练中的梯度消失以及不稳定的问题，并且能降低过拟合现象：

![MommyTalk1649316689438](_images/FMLP-Rec/MommyTalk1649316689438.svg)

**Feed-forward layers**：

模块后半部分是一个前馈层（双层MLP）与Add & Norm层的组合。通过前馈层引入非线性关系，Add & Norm与Filter Layer模块中一致，通过Dropout、残差连接、Layer Normalization来防止过拟合，让模型有能力堆叠更多层来加深网络结构：

![MommyTalk1649316717266](_images/FMLP-Rec/MommyTalk1649316717266.svg)

#### 4.1.3 Prediction Layer

![MommyTalk1649316742552](_images/FMLP-Rec/MommyTalk1649316742552.svg)

![MommyTalk1649316765032](_images/FMLP-Rec/MommyTalk1649316765032.svg)

### 4.2 Theoretical Analysis with Filter Layers

从理论上来说，这种频率域的可学习滤波器与序列的点乘，相当于在时间域对其进行循环卷积，即$f^{(t)} * h^{(t)}=\mathcal{F}^{-1}\left(\mathbf{w}^{(t)} \odot \mathbf{x}^{(t)}\right)$，证明如下：

![MommyTalk1649318221650](_images/FMLP-Rec/MommyTalk1649318221650.svg)

## 5. EXPERIMENT

![image-20220328093436975](_images/FMLP-Rec/image-20220328093436975.png)

![image-20220328101109800](_images/FMLP-Rec/image-20220328101109800.png)

![image-20220328101130776](_images/FMLP-Rec/image-20220328101130776.png)

## 6 FURTHER ANALYSIS

### 6.1 Ablation tudy

![image-20220328101411667](_images/FMLP-Rec/image-20220328101411667.png)

### 6.2 Applying Learnable Filters to Other Models

![image-20220328101626015](_images/FMLP-Rec/image-20220328101626015.png)

### 6.3 Visualization of filter layer

![image-20220328103249055](_images/FMLP-Rec/image-20220328103249055.png)


## 6. CONCLUSION

我们通过引入滤波机制，并舍弃Transformer中的复杂模块，最终得到一个**基于可学习滤波器的纯MLP模型——FMLP-Rec**。滤波器层本质上是一个频域下的MLP层，其可以在训练过程中通过随机梯度下降可以自适应地对用户行为序列中不同频段滤波机制进行调整，理论上来说等同于时间域的循环卷积，其更易于提取周期信号，并且同时兼具全局感受野和更低的时间复杂度。FMLP-Rec模型在8个数据集上击败了目前SOTA的基于RNN、CNN、GNN以及Transformer的神经网络模型。









